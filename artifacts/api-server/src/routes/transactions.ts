import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const txs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, session.userId))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(100);
    return res.json(txs.map(t => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: t.amount,
      counterpartUsername: t.counterpartUsername,
      description: t.description,
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    })));
  } catch (err) {
    console.error("Get transactions error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
