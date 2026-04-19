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
    const mineral = rollMineral();

    let result: {
      balance: string;
      diamond: string;
      ruby: string;
      emerald: string;
      legendaryJewel: string;
      mineral: Mineral;
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

      const balance = parseFloat(u.balance || "0");
      if (balance < COST) throw new AppError("Saldo insuficiente para minar");

      const newBalance = (balance - COST).toFixed(5);

      const updateData: any = { balance: newBalance };
      const newValues = {
        diamond: u.diamond,
        ruby: u.ruby,
        emerald: u.emerald,
        legendaryJewel: u.legendaryJewel,
      };

      if (mineral) {
        const cur = parseFloat((u as any)[mineral] || "0");
        const next = (cur + REWARD).toFixed(5);
        updateData[mineral] = next;
        (newValues as any)[mineral] = next;
      }

      await tx.update(usersTable).set(updateData).where(eq(usersTable.id, userId));

      await tx.insert(transactionsTable).values({
        userId,
        type: "egreso",
        amount: COST.toFixed(5),
        description: mineral
          ? `Minería: encontraste ${REWARD.toFixed(5)} de ${mineralLabel(mineral)}`
          : "Minería: sin recompensa",
      });

      result = {
        balance: newBalance,
        ...newValues,
        mineral,
      };
    });

    return res.json(result);
  } catch (err: any) {
    handleError(err, res, "Mining error");
  }
});

function mineralLabel(m: Exclude<Mineral, null>): string {
  return {
    ruby: "Rubí",
    emerald: "Esmeralda",
    diamond: "Diamante",
    legendaryJewel: "Joya Legendaria",
  }[m];
}

export default router;
