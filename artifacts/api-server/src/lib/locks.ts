import { sql } from "drizzle-orm";

export const LOCK_ERROR_MSG =
  "Se bloqueó la transacción. Intentá de nuevo en un momento.";

export function isLockError(err: any): boolean {
  // PostgreSQL error code 55P03 = lock_not_available (NOWAIT)
  return (
    err?.code === "55P03" ||
    (typeof err?.message === "string" &&
      err.message.toLowerCase().includes("could not obtain lock"))
  );
}

/** Throw a business-logic error with the given HTTP status code */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Acquire row-level locks on users in ascending ID order (prevents deadlocks).
 * Throws immediately if any lock can't be acquired (NOWAIT).
 */
export async function lockUsers(tx: any, ...userIds: number[]) {
  const sorted = [...new Set(userIds)].sort((a, b) => a - b);
  for (const id of sorted) {
    await tx.execute(
      sql`SELECT id FROM users WHERE id = ${id} FOR UPDATE NOWAIT`
    );
  }
}

/** Lock a personal reserve row. */
export async function lockReserve(tx: any, reserveId: number) {
  await tx.execute(
    sql`SELECT id FROM reserves WHERE id = ${reserveId} FOR UPDATE NOWAIT`
  );
}

/** Lock a shared reserve row. */
export async function lockSharedReserve(tx: any, reserveId: number) {
  await tx.execute(
    sql`SELECT id FROM shared_reserves WHERE id = ${reserveId} FOR UPDATE NOWAIT`
  );
}

/**
 * Unified catch handler — returns true if the response was already sent.
 * Usage: if (handleError(err, res)) return;
 */
export function handleError(err: any, res: any, context = ""): boolean {
  if (isLockError(err)) {
    res.status(409).json({ error: LOCK_ERROR_MSG });
    return true;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return true;
  }
  if (context) console.error(`${context}:`, err);
  res.status(500).json({ error: "Error interno del servidor" });
  return true;
}
