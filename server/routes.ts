import type { Express } from "express";
import { createServer, type Server } from "http";
import { requireClerkUser, handleClerkWebhook } from './auth';
import analyticsRouter from './routes/analytics';
import bugReportsRouter from './routes/bugReports';
import adminRouter from './routes/admin';
import emailsRouter from './routes/emails';
import devToolsRouter from './routes/devTools';
import contentRouter from './routes/content';
import arOfficeRouter from './routes/arOffice';
import executivesRouter from './routes/executives';
import artistsRouter from './routes/artists';
import projectsRouter from './routes/projects';
import chartsRouter from './routes/charts';
import releasesRouter from './routes/releases';
import tourRouter from './routes/tour';
import gamesRouter from './routes/games';
import savesRouter from './routes/saves';
import gameLoopRouter from './routes/gameLoop';
import { ClerkExpressWithAuth, clerkClient } from '@clerk/clerk-sdk-node';

export async function registerRoutes(app: Express): Promise<Server> {

  // Clerk webhooks
  app.post('/api/webhooks/clerk', handleClerkWebhook);
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Email endpoints
  app.use(emailsRouter);

  // Current user metadata (minimal): isAdmin flag derived from Clerk privateMetadata
  app.get('/api/me', ClerkExpressWithAuth(), async (req, res) => {
    try {
      const clerkUserId = (req as any).auth?.userId;
      if (!clerkUserId) {
        return res.json({ isAuthenticated: false, isAdmin: false, user: null });
      }
      const user = await clerkClient.users.getUser(clerkUserId);
      const isAdmin = (user as any)?.privateMetadata?.role === 'admin';
      res.json({
        isAuthenticated: true,
        isAdmin,
        user: {
          id: user.id,
          email: user.emailAddresses?.[0]?.emailAddress ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
        },
      });
    } catch (error) {
      console.error('[API /me] Error:', error);
      res.status(500).json({ isAuthenticated: false, isAdmin: false, user: null });
    }
  });

  app.use(adminRouter);

  app.use(devToolsRouter);

  // Game lifecycle endpoints extracted to server/routes/games.ts (PR-13)
  // Mounted at the original position of GET /api/game/:id to preserve registration order.
  // Includes the legacy GET /api/game-state (originally far below); relative in-router order preserved.
  app.use(gamesRouter);

  app.use(contentRouter);

  // ========================= A&R OFFICE ENDPOINTS =========================
  app.use(arOfficeRouter);

  // Roles / executives / dialogue endpoints extracted to server/routes/executives.ts (PR-8)
  // Mounted at the original position of GET /api/roles/:roleId to preserve registration order.
  app.use(executivesRouter);

  // Artist (state) endpoints extracted to server/routes/artists.ts (PR-9)
  // Mounted at the original position of POST /api/game/:gameId/artist-dialogue to preserve registration order.
  app.use(artistsRouter);

  // Projects endpoints extracted to server/routes/projects.ts (PR-10)
  // Mounted at the original position of POST /api/budget-calculation to preserve registration order.
  app.use(projectsRouter);

  // Game loop endpoints extracted to server/routes/gameLoop.ts (PR-14)
  // Mounted at the original position of POST /api/game/:gameId/actions to preserve registration order.
  // Includes POST /api/advance-week and POST /api/select-actions; relative in-router order preserved.
  app.use(gameLoopRouter);

  // OLD ENDPOINT REMOVED - Use /api/advance-week instead
  // This endpoint did not have campaign completion logic (52-week campaign; see
  // data/balance/projects.json time_progression.campaign_length_weeks)

  // Save endpoints extracted to server/routes/saves.ts (PR-14)
  // Mounted at the original position of GET /api/saves to preserve registration order.
  app.use(savesRouter);

  // REMOVED: Duplicate role endpoints - using the implementation at lines 307-362 instead

  // Dialogue endpoints (/api/dialogue/:roleType, /api/dialogue-scenes) extracted to
  // server/routes/executives.ts (PR-8), mounted via executivesRouter above.

  // Songs & Releases endpoints (13 routes) extracted to
  // server/routes/releases.ts (PR-12), mounted via releasesRouter here.
  app.use(releasesRouter);

  app.use(chartsRouter);

  // Phase 2: Turn System Endpoints
  // GET /api/game-state extracted to server/routes/games.ts (PR-13); mounted above with the games router.

  app.use(tourRouter);

  app.use(bugReportsRouter);

  // Register analytics routes
  app.use('/api/analytics', requireClerkUser, analyticsRouter);

  const httpServer = createServer(app);
  return httpServer;
}
