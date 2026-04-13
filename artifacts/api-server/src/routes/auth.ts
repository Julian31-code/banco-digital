import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, formatBalance } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Las contraseñas no coinciden" });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: "El nombre de usuario debe tener entre 3 y 30 caracteres" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      username,
      passwordHash,
      balance: "0.00000",
    }).returning();
    const session = req.session as any;
    session.userId = user.id;
    return res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        balance: formatBalance(user.balance),
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      message: "Cuenta creada exitosamente",
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    const session = req.session as any;
    session.userId = user.id;
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        balance: formatBalance(user.balance),
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Sesión cerrada" });
  });
});

router.get("/me", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }
    return res.json({
      id: user.id,
      username: user.username,
      balance: formatBalance(user.balance),
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
