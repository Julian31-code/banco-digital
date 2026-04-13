import bcrypt from "bcrypt";
import { Request } from "express";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request): number {
  const session = req.session as any;
  if (!session?.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return session.userId as number;
}

export function formatBalance(value: string | null | undefined): string {
  if (!value) return "0.00000";
  const num = parseFloat(value);
  if (isNaN(num)) return "0.00000";
  return num.toFixed(5);
}
