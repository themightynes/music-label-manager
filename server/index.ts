import express, { type Request, Response, NextFunction } from "express";
import session from 'express-session';
import passport from 'passport';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDatabaseConnection } from "./db";
import './auth'; // Initialize passport configuration

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'music-label-manager-secret-dev-only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Test database connection on startup
  console.log('[Database] Testing connection...');
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.error('[Database] Initial connection failed. Server will continue but database operations may fail.');
  } else {
    console.log('[Database] Connection successful');
  }

  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error details
    console.error('[Error Middleware]', {
      status,
      message,
      code: err.code,
      detail: err.detail,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // Handle specific database errors
    if (err.code === '57P01') {
      // Database connection terminated
      console.error('[Database] Connection terminated, pool will automatically reconnect');
      res.status(503).json({ 
        message: 'Database temporarily unavailable. Please try again.',
        retryAfter: 5 
      });
      return;
    }
    
    // Handle other database connection errors
    if (err.code && err.code.startsWith('08')) {
      // Connection exceptions (08xxx codes)
      res.status(503).json({ 
        message: 'Database connection error. Please try again later.',
        retryAfter: 10 
      });
      return;
    }
    
    // Handle timeout errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
      res.status(504).json({ 
        message: 'Request timeout. Please try again.',
        retryAfter: 5 
      });
      return;
    }

    // Default error response
    res.status(status).json({ 
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        code: err.code,
        detail: err.detail 
      })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
