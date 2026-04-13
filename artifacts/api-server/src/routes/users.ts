import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, reservesTable, sharedReserveMembersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword, formatBalance } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/me/profile", async (_req, res) => {
  res.status(405).json({ error: "Method not allowed" });
});

router.patch("/me/profile", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const { avatarUrl } = req.body;
    const [user] = await db.update(usersTable)
      .set({ avatarUrl: avatarUrl ?? null })
      .where(eq(usersTable.id, session.userId))
      .returning();
    return res.json({
      id: user.id,
      username: user.username,
      balance: formatBalance(user.balance),
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.patch("/me/password", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: "Las nuevas contraseñas no coinciden" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: "La contraseña actual es incorrecta" });
    }
    const newHash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, session.userId));
    return res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/me/account", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) return res.status(401).json({ error: "No autenticado" });
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Contraseña requerida" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: "Contraseña incorrecta" });
    }
    const balance = parseFloat(user.balance || "0");
    if (balance > 0) {
      return res.status(400).json({ error: "Debés tener saldo cero para eliminar tu cuenta" });
    }
    const reserves = await db.select().from(reservesTable).where(eq(reservesTable.userId, session.userId));
    if (reserves.length > 0) {
      return res.status(400).json({ error: "Debés eliminar todas tus reservas personales antes de eliminar tu cuenta" });
    }
    const sharedMemberships = await db.select().from(sharedReserveMembersTable).where(eq(sharedReserveMembersTable.userId, session.userId));
    if (sharedMemberships.length > 0) {
      return res.status(400).json({ error: "Debés salirte de todas las reservas compartidas antes de eliminar tu cuenta" });
    }
    await db.delete(usersTable).where(eq(usersTable.id, session.userId));
    req.session.destroy(() => {
      res.json({ message: "Cuenta eliminada exitosamente" });
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
