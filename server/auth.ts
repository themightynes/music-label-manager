import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100)
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// Simple password hashing (in production, use bcrypt or similar)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Passport configuration
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));

      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      if (!verifyPassword(password, user.password)) {
        return done(null, false, { message: 'Invalid password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    done(null, user || null);
  } catch (error) {
    done(error);
  }
});

// Middleware to ensure user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      error: 'UNAUTHORIZED' 
    });
  }
  next();
}

// Middleware to get user ID from session or create demo user
export async function getUserId(req: Request, res: Response, next: NextFunction) {
  try {
    // If user is authenticated, use their ID
    if (req.user) {
      req.userId = (req.user as any).id;
      return next();
    }

    // For demo/development purposes, create or get demo user
    let [demoUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'demo-user'));

    if (!demoUser) {
      [demoUser] = await db
        .insert(users)
        .values({
          username: 'demo-user',
          password: hashPassword('demo-password')
        })
        .returning();
    }

    req.userId = demoUser.id;
    next();
  } catch (error) {
    console.error('Error getting user ID:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
}

// Authentication routes
export async function registerUser(username: string, password: string) {
  // Validate input
  const validatedData = registerSchema.parse({ username, password });
  
  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, validatedData.username));

  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      username: validatedData.username,
      password: hashPassword(validatedData.password)
    })
    .returning();

  return newUser;
}

export async function loginUser(username: string, password: string) {
  const validatedData = loginSchema.parse({ username, password });
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, validatedData.username));

  if (!user || !verifyPassword(validatedData.password, user.password)) {
    throw new Error('Invalid credentials');
  }

  return user;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}