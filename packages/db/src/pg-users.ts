import { eq } from "drizzle-orm";
import { db } from "./drizzle/client";
import { users } from "./drizzle/schema";
import type { UserRole, User } from "@workspace/types";

function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    role: row.role as UserRole,
    email: row.email,
    createdAt: row.createdAt,
  };
}

export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  const row = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  return row ? toUser(row) : null;
}

export async function upsertUser(
  clerkUserId: string,
  email: string,
  name: string,
  role: UserRole
): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ clerkUserId, email, name, role })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { role, email, name, updatedAt: new Date() },
    })
    .returning();
  return toUser(row!);
}
