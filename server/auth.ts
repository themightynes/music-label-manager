import type { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node';
import { Webhook, type WebhookRequiredHeaders } from 'svix';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from '../shared/schema';

type ClerkLikeUser = {
  id: string;
  username?: string | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
  primary_email_address_id?: string | null;
};

function resolveEmail(clerkUser: ClerkLikeUser): string | null {
  if (clerkUser.primaryEmailAddress?.emailAddress) {
    return clerkUser.primaryEmailAddress.emailAddress;
  }

  if (clerkUser.primaryEmailAddressId && Array.isArray(clerkUser.emailAddresses)) {
    const match = clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId);
    if (match) {
      return match.emailAddress;
    }
  }

  if (Array.isArray(clerkUser.emailAddresses) && clerkUser.emailAddresses.length > 0) {
    return clerkUser.emailAddresses[0].emailAddress;
  }

  if (clerkUser.primary_email_address_id && Array.isArray(clerkUser.email_addresses)) {
    const match = clerkUser.email_addresses.find((email) => email.id === clerkUser.primary_email_address_id);
    if (match) {
      return match.email_address;
    }
  }

  if (Array.isArray(clerkUser.email_addresses) && clerkUser.email_addresses.length > 0) {
    return clerkUser.email_addresses[0].email_address;
  }

  return null;
}

function resolveUsername(clerkUser: ClerkLikeUser, email: string | null): string | null {
  if (clerkUser.username) {
    return clerkUser.username;
  }

  if (email) {
    return email.split('@')[0];
  }

  return null;
}

export async function getOrCreateUserFromClerk(clerkId: string) {
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email = resolveEmail({
    id: clerkUser.id,
    username: clerkUser.username,
    emailAddresses: clerkUser.emailAddresses?.map(({ id, emailAddress }) => ({ id, emailAddress })),
    primaryEmailAddressId: clerkUser.primaryEmailAddressId,
    primaryEmailAddress: clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)
  });

  if (!email) {
    throw new Error('Clerk user is missing a primary email address.');
  }

  const username = resolveUsername({ id: clerkUser.id, username: clerkUser.username }, email);

  const [userRecord] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email,
      username,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email,
        username,
      },
    })
    .returning();

  return userRecord;
}

const requireSession = ClerkExpressRequireAuth();

export function requireClerkUser(req: Request, res: Response, next: NextFunction) {
  requireSession(req, res, async (sessionError?: any) => {
    if (sessionError) {
      if (sessionError.status === 401 || sessionError.statusCode === 401) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      return next(sessionError);
    }

    try {
      const clerkId = (req as any).auth?.userId;

      if (!clerkId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRecord = await getOrCreateUserFromClerk(clerkId);

      req.userId = userRecord.id;
      (req as any).clerkUserId = clerkId;
      next();
    } catch (error) {
      console.error('[Clerk] Failed to resolve authenticated user', error);
      res.status(500).json({ message: 'Failed to resolve authenticated user' });
    }
  });
}

export async function handleClerkWebhook(req: Request, res: Response) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[Clerk] CLERK_WEBHOOK_SECRET is not configured. Skipping webhook handling.');
    return res.status(200).json({ skipped: true });
  }

  const payload = (req as any).rawBody as Buffer | undefined;
  if (!payload) {
    return res.status(400).json({ message: 'Missing webhook payload' });
  }

  const headers = req.headers as unknown as WebhookRequiredHeaders;

  try {
    const webhook = new Webhook(webhookSecret);
    const event = webhook.verify(payload.toString('utf8'), headers) as { type: string; data: ClerkLikeUser & { deleted?: boolean } };

    if (!event?.type || !event?.data?.id) {
      return res.status(400).json({ message: 'Invalid webhook event' });
    }

    const clerkUser = event.data;

    if (event.type === 'user.deleted') {
      await db.delete(users).where(eq(users.clerkId, clerkUser.id));
      return res.status(200).json({ success: true });
    }

    const email = resolveEmail(clerkUser);
    if (!email) {
      return res.status(400).json({ message: 'Clerk webhook payload missing email' });
    }

    const username = resolveUsername(clerkUser, email);

    await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        email,
        username,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email,
          username,
        },
      });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Clerk] Webhook verification failed', error);
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const clerkId = (req as any).clerkUserId || (req as any).auth?.userId;
      if (!clerkId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await clerkClient.users.getUser(clerkId);
      const isAdmin = (user as any)?.privateMetadata?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      (req as any).isAdmin = true;
      next();
    } catch (error) {
      console.error('[Clerk] Failed admin check', error);
      res.status(500).json({ message: 'Failed to verify admin access' });
    }
  })();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      rawBody?: Buffer;
      clerkUserId?: string;
      auth?: {
        userId: string | null;
        sessionId: string | null;
      };
      isAdmin?: boolean;
    }
  }
}
