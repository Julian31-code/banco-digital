import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { formatBalance } from "../lib/auth.js";
import { lockUsers, AppError, handleError } from "../lib/locks.js";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });

    const { toUsername, amount } = req.body;
    if (!toUsername || !amount) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a cero" });
    }
    if (amountNum > 999999999.99999) {
      return res.status(400).json({ error: "Monto demasiado grande" });
    }

    // Pre-flight: resolve IDs before the transaction (read-only, safe)
    const [sender] = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    if (!sender) return res.status(401).json({ error: "Usuario no encontrado" });
    if (sender.username === toUsername) {
      return res.status(400).json({ error: "No podés transferirte dinero a vos mismo" });
    }

    const [recipient] = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.username, toUsername))
      .limit(1);
    if (!recipient) return res.status(404).json({ error: "Usuario destinatario no encontrado" });

    const amountStr = amountNum.toFixed(5);
    let newSenderBalance = "";

    await db.transaction(async (tx) => {
      // Lock both rows atomically (ascending ID order prevents deadlocks)
      await lockUsers(tx, sender.id, recipient.id);

      // Re-read fresh balances while we hold the locks
      const [s] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, sender.id)).limit(1);
      const [r] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, recipient.id)).limit(1);

      const senderBal = parseFloat(s!.balance || "0");
      if (senderBal < amountNum) throw new AppError("Saldo insuficiente");

      newSenderBalance = (senderBal - amountNum).toFixed(5);
      const newRecipientBalance = (parseFloat(r!.balance || "0") + amountNum).toFixed(5);

      await tx.update(usersTable).set({ balance: newSenderBalance }).where(eq(usersTable.id, sender.id));
      await tx.update(usersTable).set({ balance: newRecipientBalance }).where(eq(usersTable.id, recipient.id));
      await tx.insert(transactionsTable).values([
        {
          userId: sender.id,
          type: "egreso",
          amount: amountStr,
          counterpartUsername: recipient.username,
          description: `Transferencia a @${recipient.username}`,
        },
        {
          userId: recipient.id,
          type: "ingreso",
          amount: amountStr,
          counterpartUsername: sender.username,
          description: `Transferencia de @${sender.username}`,
        },
      ]);
    });

    return res.json({
      message: `Transferencia de D$ ${amountStr} a @${toUsername} realizada exitosamente`,
      newBalance: formatBalance(newSenderBalance),
    });
  } catch (err: any) {
    handleError(err, res, "Transfer error");
  }
});

export default router;
