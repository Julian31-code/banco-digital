import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { lockUsers, AppError, handleError } from "../lib/locks.js";

const router: IRouter = Router();

const COST = 0.00001;
const REWARD = 0.00001;

type Mineral = "ruby" | "emerald" | "diamond" | "legendaryJewel" | null;

function rollMineral(): Mineral {
  // 99.99% nothing, 0.01% legendary jewel
  return Math.random() < 0.0001 ? "legendaryJewel" : null;
}

router.post("/mine", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });

    const userId = session.userId as number;
    const requestedCount = Math.max(1, Math.min(20, Number(req.body?.count) || 1));

    let result: {
      balance: string;
      diamond: string;
      ruby: string;
      emerald: string;
      legendaryJewel: string;
      minedCount: number;
      jewelsFound: number;
    } | null = null;

    await db.transaction(async (tx) => {
      await lockUsers(tx, userId);

      const [u] = await tx
        .select({
          balance: usersTable.balance,
          diamond: usersTable.diamond,
          ruby: usersTable.ruby,
          emerald: usersTable.emerald,
          legendaryJewel: usersTable.legendaryJewel,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!u) throw new AppError("Usuario no encontrado", 404);

      let balance = parseFloat(u.balance || "0");
      let jewel = parseFloat(u.legendaryJewel || "0");

      const affordable = Math.min(requestedCount, Math.floor(balance / COST));
      if (affordable < 1) throw new AppError("Saldo insuficiente para minar");

      let jewelsFound = 0;
      for (let i = 0; i < affordable; i++) {
        balance -= COST;
        if (rollMineral() === "legendaryJewel") {
          jewel += REWARD;
          jewelsFound++;
        }
      }

      const newBalance = balance.toFixed(5);
      const newJewel = jewel.toFixed(5);

      await tx.update(usersTable)
        .set({ balance: newBalance, legendaryJewel: newJewel })
        .where(eq(usersTable.id, userId));

      const totalCost = (COST * affordable).toFixed(5);
      await tx.insert(transactionsTable).values({
        userId,
        type: "egreso",
        amount: totalCost,
        description: jewelsFound > 0
          ? `Minería x${affordable}: encontraste ${(REWARD * jewelsFound).toFixed(5)} Joya Legendaria`
          : `Minería x${affordable}: sin recompensa`,
      });

      result = {
        balance: newBalance,
        diamond: u.diamond,
        ruby: u.ruby,
        emerald: u.emerald,
        legendaryJewel: newJewel,
        minedCount: affordable,
        jewelsFound,
      };
    });

    return res.json(result);
  } catch (err: any) {
    handleError(err, res, "Mining error");
  }
});

export default router;
