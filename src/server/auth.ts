import "server-only";

import { prisma } from "@/lib/db";

const DEMO_USER_ID = "demo_user_local";

export async function requireClerkUserId(): Promise<string> {
  return DEMO_USER_ID;
}

export async function requireDbUser() {
  const dbUser = await prisma.user.upsert({
    where: { clerkId: DEMO_USER_ID },
    update: {},
    create: { clerkId: DEMO_USER_ID },
  });
  return dbUser;
}

export async function getCurrentClerkUser() {
  return { id: DEMO_USER_ID };
}
