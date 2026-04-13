import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, reservesTable, transactionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { formatBalance } from "../lib/auth.js";
import { lockUsers, lockReserve, AppError, handleError } from "../lib/locks.js";

const router: IRouter = Router();

function formatReserve(r: any) {
  return {
    id: r.id,
    name: r.name,
    balance: formatBalance(r.balance),
    userId: r.userId,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserves = await db.select().from(reservesTable).where(eq(reservesTable.userId, session.userId));
    return res.json(reserves.map(formatReserve));
  } catch (err) {
    handleError(err, res, "Get reserves error");
  }
});

router.post("/", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "El nombre de la reserva es obligatorio" });
    }
    const [reserve] = await db.insert(reservesTable).values({
      name: name.trim(),
      userId: session.userId,
      balance: "0.00000",
    }).returning();
    return res.status(201).json(formatReserve(reserve));
  } catch (err) {
    handleError(err, res, "Create reserve error");
  }
});

router.patch("/:reserveId", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    const [reserve] = await db.update(reservesTable)
      .set({ name: name.trim() })
      .where(and(eq(reservesTable.id, reserveId), eq(reservesTable.userId, session.userId)))
      .returning();
    if (!reserve) return res.status(404).json({ error: "Reserva no encontrada" });
    return res.json(formatReserve(reserve));
  } catch (err) {
    handleError(err, res, "Update reserve error");
  }
});

router.delete("/:reserveId", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const [reserve] = await db.select().from(reservesTable)
      .where(and(eq(reservesTable.id, reserveId), eq(reservesTable.userId, session.userId)))
      .limit(1);
    if (!reserve) return res.status(404).json({ error: "Reserva no encontrada" });
    if (parseFloat(reserve.balance || "0") > 0) {
      return res.status(400).json({ error: "La reserva debe tener saldo cero para eliminarla" });
    }
    await db.delete(reservesTable).where(eq(reservesTable.id, reserveId));
    return res.json({ message: "Reserva eliminada exitosamente" });
  } catch (err) {
    handleError(err, res, "Delete reserve error");
  }
});

router.post("/:reserveId/deposit", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const amountNum = parseFloat(req.body.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a cero" });
    }

    // Pre-flight ownership check
    const [reserveMeta] = await db.select({ id: reservesTable.id, name: reservesTable.name })
      .from(reservesTable)
      .where(and(eq(reservesTable.id, reserveId), eq(reservesTable.userId, session.userId)))
      .limit(1);
    if (!reserveMeta) return res.status(404).json({ error: "Reserva no encontrada" });

    let updated: any;

    await db.transaction(async (tx) => {
      // Lock reserve then user (consistent order for all reserve ops)
      await lockReserve(tx, reserveId);
      await lockUsers(tx, session.userId);

      const [user] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      const [reserve] = await tx.select({ balance: reservesTable.balance }).from(reservesTable).where(eq(reservesTable.id, reserveId)).limit(1);

      const userBal = parseFloat(user!.balance || "0");
      if (userBal < amountNum) throw new AppError("Saldo insuficiente");

      const newUserBalance = (userBal - amountNum).toFixed(5);
      const newReserveBal = (parseFloat(reserve!.balance || "0") + amountNum).toFixed(5);

      await tx.update(usersTable).set({ balance: newUserBalance }).where(eq(usersTable.id, session.userId));
      const [r] = await tx.update(reservesTable).set({ balance: newReserveBal }).where(eq(reservesTable.id, reserveId)).returning();
      await tx.insert(transactionsTable).values({
        userId: session.userId,
        type: "egreso",
        amount: amountNum.toFixed(5),
        counterpartUsername: null,
        description: `Depósito en reserva "${reserveMeta.name}"`,
      });
      updated = r;
    });

    return res.json(formatReserve(updated));
  } catch (err: any) {
    handleError(err, res, "Deposit reserve error");
  }
});

router.post("/:reserveId/withdraw", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const amountNum = parseFloat(req.body.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a cero" });
    }

    // Pre-flight ownership check
    const [reserveMeta] = await db.select({ id: reservesTable.id, name: reservesTable.name })
      .from(reservesTable)
      .where(and(eq(reservesTable.id, reserveId), eq(reservesTable.userId, session.userId)))
      .limit(1);
    if (!reserveMeta) return res.status(404).json({ error: "Reserva no encontrada" });

    let updated: any;

    await db.transaction(async (tx) => {
      // Lock reserve then user
      await lockReserve(tx, reserveId);
      await lockUsers(tx, session.userId);

      const [reserve] = await tx.select({ balance: reservesTable.balance }).from(reservesTable).where(eq(reservesTable.id, reserveId)).limit(1);
      const [user] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);

      const reserveBal = parseFloat(reserve!.balance || "0");
      if (reserveBal < amountNum) throw new AppError("Saldo insuficiente en la reserva");

      const newReserveBal = (reserveBal - amountNum).toFixed(5);
      const newUserBalance = (parseFloat(user!.balance || "0") + amountNum).toFixed(5);

      await tx.update(usersTable).set({ balance: newUserBalance }).where(eq(usersTable.id, session.userId));
      const [r] = await tx.update(reservesTable).set({ balance: newReserveBal }).where(eq(reservesTable.id, reserveId)).returning();
      await tx.insert(transactionsTable).values({
        userId: session.userId,
        type: "ingreso",
        amount: amountNum.toFixed(5),
        counterpartUsername: null,
        description: `Retiro de reserva "${reserveMeta.name}"`,
      });
      updated = r;
    });

    return res.json(formatReserve(updated));
  } catch (err: any) {
    handleError(err, res, "Withdraw reserve error");
  }
});

export default router;
