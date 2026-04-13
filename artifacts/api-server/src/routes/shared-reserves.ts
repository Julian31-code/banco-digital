import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, sharedReservesTable, sharedReserveMembersTable, removeVotesTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { formatBalance } from "../lib/auth.js";
import { lockUsers, lockSharedReserve, AppError, handleError } from "../lib/locks.js";

const router: IRouter = Router();

async function getSharedReserveWithMembers(reserveId: number) {
  const [reserve] = await db.select().from(sharedReservesTable).where(eq(sharedReservesTable.id, reserveId)).limit(1);
  if (!reserve) return null;
  const members = await db.select({
    userId: sharedReserveMembersTable.userId,
    joinedAt: sharedReserveMembersTable.joinedAt,
    username: usersTable.username,
    avatarUrl: usersTable.avatarUrl,
  })
    .from(sharedReserveMembersTable)
    .innerJoin(usersTable, eq(sharedReserveMembersTable.userId, usersTable.id))
    .where(eq(sharedReserveMembersTable.sharedReserveId, reserveId));
  return {
    id: reserve.id,
    name: reserve.name,
    balance: formatBalance(reserve.balance),
    createdByUserId: reserve.createdByUserId,
    createdAt: reserve.createdAt instanceof Date ? reserve.createdAt.toISOString() : reserve.createdAt,
    members: members.map(m => ({
      userId: m.userId,
      username: m.username,
      avatarUrl: m.avatarUrl,
      joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
    })),
  };
}

router.get("/", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const memberships = await db.select().from(sharedReserveMembersTable).where(eq(sharedReserveMembersTable.userId, session.userId));
    const results = await Promise.all(memberships.map(m => getSharedReserveWithMembers(m.sharedReserveId)));
    return res.json(results.filter(Boolean));
  } catch (err) {
    handleError(err, res, "Get shared reserves error");
  }
});

router.post("/", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const { name, memberUsernames } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    const [reserve] = await db.insert(sharedReservesTable).values({
      name: name.trim(),
      createdByUserId: session.userId,
      balance: "0.00000",
    }).returning();
    await db.insert(sharedReserveMembersTable).values({
      sharedReserveId: reserve.id,
      userId: session.userId,
    });
    if (Array.isArray(memberUsernames) && memberUsernames.length > 0) {
      for (const username of memberUsernames) {
        if (!username) continue;
        const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
        if (user && user.id !== session.userId) {
          await db.insert(sharedReserveMembersTable).values({
            sharedReserveId: reserve.id,
            userId: user.id,
          }).onConflictDoNothing();
        }
      }
    }
    const result = await getSharedReserveWithMembers(reserve.id);
    return res.status(201).json(result);
  } catch (err) {
    handleError(err, res, "Create shared reserve error");
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
    const member = await db.select().from(sharedReserveMembersTable)
      .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, session.userId)))
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "No sos miembro de esta reserva" });
    await db.update(sharedReservesTable).set({ name: name.trim() }).where(eq(sharedReservesTable.id, reserveId));
    const result = await getSharedReserveWithMembers(reserveId);
    return res.json(result);
  } catch (err) {
    handleError(err, res, "Update shared reserve error");
  }
});

router.delete("/:reserveId", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const member = await db.select().from(sharedReserveMembersTable)
      .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, session.userId)))
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "No sos miembro de esta reserva" });
    const [reserve] = await db.select().from(sharedReservesTable).where(eq(sharedReservesTable.id, reserveId)).limit(1);
    if (!reserve) return res.status(404).json({ error: "Reserva no encontrada" });
    if (parseFloat(reserve.balance || "0") > 0) {
      return res.status(400).json({ error: "La reserva debe tener saldo cero para eliminarla" });
    }
    await db.delete(sharedReservesTable).where(eq(sharedReservesTable.id, reserveId));
    return res.json({ message: "Reserva eliminada exitosamente" });
  } catch (err) {
    handleError(err, res, "Delete shared reserve error");
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

    // Membership check (outside tx, read-only)
    const member = await db.select().from(sharedReserveMembersTable)
      .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, session.userId)))
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "No sos miembro de esta reserva" });

    // Fetch reserve name for transaction description
    const [reserveMeta] = await db.select({ name: sharedReservesTable.name }).from(sharedReservesTable).where(eq(sharedReservesTable.id, reserveId)).limit(1);
    if (!reserveMeta) return res.status(404).json({ error: "Reserva no encontrada" });

    await db.transaction(async (tx) => {
      // Lock shared reserve first, then user
      await lockSharedReserve(tx, reserveId);
      await lockUsers(tx, session.userId);

      const [user] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      const [reserve] = await tx.select({ balance: sharedReservesTable.balance }).from(sharedReservesTable).where(eq(sharedReservesTable.id, reserveId)).limit(1);

      const userBal = parseFloat(user!.balance || "0");
      if (userBal < amountNum) throw new AppError("Saldo insuficiente");

      const newUserBal = (userBal - amountNum).toFixed(5);
      const newReserveBal = (parseFloat(reserve!.balance || "0") + amountNum).toFixed(5);

      await tx.update(usersTable).set({ balance: newUserBal }).where(eq(usersTable.id, session.userId));
      await tx.update(sharedReservesTable).set({ balance: newReserveBal }).where(eq(sharedReservesTable.id, reserveId));
    });

    const result = await getSharedReserveWithMembers(reserveId);
    return res.json(result);
  } catch (err: any) {
    handleError(err, res, "Deposit shared reserve error");
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

    // Membership check (outside tx, read-only)
    const member = await db.select().from(sharedReserveMembersTable)
      .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, session.userId)))
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "No sos miembro de esta reserva" });

    await db.transaction(async (tx) => {
      // Lock shared reserve first (this is the hot-contested resource between members)
      await lockSharedReserve(tx, reserveId);
      await lockUsers(tx, session.userId);

      // Re-read fresh values while holding the lock
      const [reserve] = await tx.select({ balance: sharedReservesTable.balance }).from(sharedReservesTable).where(eq(sharedReservesTable.id, reserveId)).limit(1);
      const [user] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);

      const reserveBal = parseFloat(reserve!.balance || "0");
      if (reserveBal < amountNum) throw new AppError("Saldo insuficiente en la reserva");

      const newReserveBal = (reserveBal - amountNum).toFixed(5);
      const newUserBal = (parseFloat(user!.balance || "0") + amountNum).toFixed(5);

      await tx.update(usersTable).set({ balance: newUserBal }).where(eq(usersTable.id, session.userId));
      await tx.update(sharedReservesTable).set({ balance: newReserveBal }).where(eq(sharedReservesTable.id, reserveId));
    });

    const result = await getSharedReserveWithMembers(reserveId);
    return res.json(result);
  } catch (err: any) {
    handleError(err, res, "Withdraw shared reserve error");
  }
});

router.post("/:reserveId/members", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const { username } = req.body;
    const member = await db.select().from(sharedReserveMembersTable)
      .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, session.userId)))
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "No sos miembro de esta reserva" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    await db.insert(sharedReserveMembersTable).values({
      sharedReserveId: reserveId,
      userId: user.id,
    }).onConflictDoNothing();
    const result = await getSharedReserveWithMembers(reserveId);
    return res.json(result);
  } catch (err) {
    handleError(err, res, "Add member error");
  }
});

router.delete("/:reserveId/members/:userId", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const targetUserId = parseInt(req.params.userId);
    const allMembers = await db.select().from(sharedReserveMembersTable)
      .where(eq(sharedReserveMembersTable.sharedReserveId, reserveId));
    const isMember = allMembers.some(m => m.userId === session.userId);
    if (!isMember) return res.status(403).json({ error: "No sos miembro de esta reserva" });
    if (targetUserId === session.userId) {
      return res.status(400).json({ error: "Usá la opción 'Salirme' para salir de la reserva" });
    }
    const otherMembers = allMembers.filter(m => m.userId !== targetUserId);
    const neededVotes = otherMembers.length;
    await db.insert(removeVotesTable).values({
      sharedReserveId: reserveId,
      targetUserId,
      voterUserId: session.userId,
    }).onConflictDoNothing();
    const votes = await db.select().from(removeVotesTable)
      .where(and(eq(removeVotesTable.sharedReserveId, reserveId), eq(removeVotesTable.targetUserId, targetUserId)));
    if (votes.length >= neededVotes) {
      await db.delete(sharedReserveMembersTable)
        .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, targetUserId)));
      await db.delete(removeVotesTable)
        .where(and(eq(removeVotesTable.sharedReserveId, reserveId), eq(removeVotesTable.targetUserId, targetUserId)));
      return res.json({ message: "Miembro eliminado", removed: true, votesNeeded: null, votesRegistered: null });
    }
    return res.json({
      message: `Voto registrado (${votes.length}/${neededVotes} votos necesarios)`,
      removed: false,
      votesNeeded: neededVotes,
      votesRegistered: votes.length,
    });
  } catch (err) {
    handleError(err, res, "Remove member error");
  }
});

router.post("/:reserveId/leave", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const reserveId = parseInt(req.params.reserveId);
    const member = await db.select().from(sharedReserveMembersTable)
      .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, session.userId)))
      .limit(1);
    if (!member.length) return res.status(403).json({ error: "No sos miembro de esta reserva" });
    const allMembers = await db.select().from(sharedReserveMembersTable).where(eq(sharedReserveMembersTable.sharedReserveId, reserveId));
    if (allMembers.length === 1) {
      return res.status(400).json({ error: "Sos el único miembro de esta reserva. Si querés salirte, eliminá la reserva directamente." });
    }
    await db.delete(sharedReserveMembersTable)
      .where(and(eq(sharedReserveMembersTable.sharedReserveId, reserveId), eq(sharedReserveMembersTable.userId, session.userId)));
    return res.json({ message: "Saliste de la reserva compartida" });
  } catch (err) {
    handleError(err, res, "Leave shared reserve error");
  }
});

export default router;
