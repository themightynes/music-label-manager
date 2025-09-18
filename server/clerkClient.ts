import { createClerkClient } from '@clerk/clerk-sdk-node';

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.warn('[Clerk] CLERK_SECRET_KEY is not set. Authentication will fail.');
}

export const clerkClient = createClerkClient({
  secretKey: secretKey || '',
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});
