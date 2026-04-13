import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable, propertiesTable, settingsTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { formatBalance } from "../lib/auth.js";
import { lockUsers, AppError, handleError } from "../lib/locks.js";

const router: IRouter = Router();

const PROPERTY_PRICE = 11;
const PROPERTY_START_BALANCE = 10;
const EXPROPRIATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const NEXT_EXPROP_KEY = "next_expropriation_at";

function requireAuth(req: any, res: any): number | null {
  if (!req.session?.userId) {
    res.status(401).json({ error: "No autenticado" });
    return null;
  }
  return (req.session as any).userId as number;
}

async function getOrInitNextExpropriationAt(): Promise<Date> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, NEXT_EXPROP_KEY)).limit(1);
  if (!row) {
    const next = new Date(Date.now() + EXPROPRIATION_INTERVAL_MS);
    await db.insert(settingsTable).values({ key: NEXT_EXPROP_KEY, value: next.toISOString() });
    return next;
  }
  return new Date(row.value);
}

async function checkAndRunExpropriation(): Promise<boolean> {
  const nextAt = await getOrInitNextExpropriationAt();
  if (Date.now() < nextAt.getTime()) return false;

  await db.transaction(async (tx) => {
    const owned = await tx.select().from(propertiesTable);

    for (const prop of owned) {
      const propBalance = parseFloat(prop.balance);
      if (propBalance <= 0) continue;

      const [user] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, prop.ownerId)).limit(1);
      if (!user) continue;

      const newBalance = (parseFloat(user.balance) + propBalance).toFixed(5);
      await tx.update(usersTable).set({ balance: newBalance }).where(eq(usersTable.id, prop.ownerId));
      await tx.insert(transactionsTable).values({
        userId: prop.ownerId,
        type: "ingreso",
        amount: propBalance.toFixed(5),
        description: `Expropiación automática — Propiedad #${prop.id}`,
      });
    }

    await tx.delete(propertiesTable);

    const next = new Date(Date.now() + EXPROPRIATION_INTERVAL_MS);
    await tx.update(settingsTable)
      .set({ value: next.toISOString(), updatedAt: new Date() })
      .where(eq(settingsTable.key, NEXT_EXPROP_KEY));
  });

  return true;
}

// GET /api/properties/timer
router.get("/timer", async (_req, res) => {
  try {
    await checkAndRunExpropriation();
    const nextAt = await getOrInitNextExpropriationAt();
    return res.json({ nextExpropiacionAt: nextAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/grid — 100 cells; only marks isMine and isPopular for owned
router.get("/grid", async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    await checkAndRunExpropriation();

    const owned = await db.select().from(propertiesTable);
    const myMap = new Map<number, { balance: string; isPopular: boolean }>();
    for (const p of owned) {
      if (p.ownerId === userId) myMap.set(p.id, { balance: p.balance, isPopular: p.isPopular });
    }

    const takenIds = new Set(owned.filter(p => p.ownerId !== userId).map(p => p.id));

    const grid = Array.from({ length: 100 }, (_, i) => {
      const id = i + 1;
      if (myMap.has(id)) {
        const info = myMap.get(id)!;
        return { id, isMine: true, balance: info.balance, isPopular: info.isPopular };
      }
      if (takenIds.has(id)) {
        return { id, isMine: false, isTaken: true };
      }
      return { id, isMine: false, isTaken: false };
    });

    const nextAt = await getOrInitNextExpropriationAt();
    return res.json({ grid, nextExpropiacionAt: nextAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/mine
router.get("/mine", async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    await checkAndRunExpropriation();

    const mine = await db.select().from(propertiesTable).where(eq(propertiesTable.ownerId, userId));
    const nextAt = await getOrInitNextExpropriationAt();
    return res.json({ properties: mine, nextExpropiacionAt: nextAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/properties/:id/popular — toggle popular status (only owner)
router.post("/:id/popular", async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const propId = parseInt(req.params.id);
    if (isNaN(propId) || propId < 1 || propId > 100) {
      return res.status(400).json({ error: "Propiedad inválida" });
    }

    const [prop] = await db.select().from(propertiesTable)
      .where(and(eq(propertiesTable.id, propId), eq(propertiesTable.ownerId, userId)))
      .limit(1);

    if (!prop) {
      return res.status(403).json({ error: "No sos el dueño de esta propiedad" });
    }

    const newPopular = !prop.isPopular;
    await db.update(propertiesTable)
      .set({ isPopular: newPopular })
      .where(eq(propertiesTable.id, propId));

    return res.json({ isPopular: newPopular });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/properties/:id/interact — buy if unowned; pay if owned by another; error if mine
router.post("/:id/interact", async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    await checkAndRunExpropriation();

    const propId = parseInt(req.params.id);
    if (isNaN(propId) || propId < 1 || propId > 100) {
      return res.status(400).json({ error: "Propiedad inválida" });
    }

    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propId)).limit(1);

    if (existing?.ownerId === userId) {
      return res.status(400).json({ error: "Ya sos el dueño de esta propiedad. Podés venderla desde Mis Propiedades.", isMine: true });
    }

    if (!existing) {
      // Unowned — buy it
      let newBalance = "";
      await db.transaction(async (tx) => {
        await lockUsers(tx, userId);
        const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (!user) throw new AppError("Usuario no encontrado");

        const balance = parseFloat(user.balance);
        if (balance < PROPERTY_PRICE) throw new AppError(`Saldo insuficiente. Necesitás D$${PROPERTY_PRICE.toFixed(5)} para comprar una propiedad.`);

        newBalance = (balance - PROPERTY_PRICE).toFixed(5);
        await tx.update(usersTable).set({ balance: newBalance }).where(eq(usersTable.id, userId));
        await tx.insert(transactionsTable).values({
          userId,
          type: "egreso",
          amount: PROPERTY_PRICE.toFixed(5),
          description: `Compra de Propiedad #${propId}`,
        });
        await tx.insert(propertiesTable).values({
          id: propId,
          ownerId: userId,
          balance: PROPERTY_START_BALANCE.toFixed(5),
        });
      });

      return res.json({ action: "bought", propertyId: propId, newBalance: parseFloat(newBalance), formattedBalance: formatBalance(newBalance) });
    }

    // Owned by someone else — buyer pays D$11
    // If the property is popular → distribute D$10 among ALL popular properties
    // If not popular → D$10 goes directly to that property
    const ownerId = existing.ownerId;
    let newBuyerBalance = "";
    let distributedTo: number[] = [];

    await db.transaction(async (tx) => {
      await lockUsers(tx, userId, ownerId);

      const [buyer] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!buyer) throw new AppError("Usuario no encontrado");

      const buyerBal = parseFloat(buyer.balance);
      if (buyerBal < PROPERTY_PRICE) throw new AppError(`Saldo insuficiente. Esta propiedad cuesta D$${PROPERTY_PRICE.toFixed(5)}.`);

      newBuyerBalance = (buyerBal - PROPERTY_PRICE).toFixed(5);
      await tx.update(usersTable).set({ balance: newBuyerBalance }).where(eq(usersTable.id, userId));
      await tx.insert(transactionsTable).values({
        userId,
        type: "egreso",
        amount: PROPERTY_PRICE.toFixed(5),
        description: `Interacción con Propiedad #${propId}`,
      });

      if (existing.isPopular) {
        // Distribute D$10 among all popular properties NOT owned by the buyer
        const popularProps = await tx.select().from(propertiesTable)
          .where(and(eq(propertiesTable.isPopular, true), ne(propertiesTable.ownerId, userId)));
        const count = popularProps.length;
        if (count > 0) {
          const amountEach = parseFloat((PROPERTY_START_BALANCE / count).toFixed(5));
          for (const pp of popularProps) {
            const newPropBal = (parseFloat(pp.balance) + amountEach).toFixed(5);
            await tx.update(propertiesTable).set({ balance: newPropBal }).where(eq(propertiesTable.id, pp.id));
          }
          distributedTo = popularProps.map(p => p.id);
        }
      } else {
        // Not popular — D$10 goes directly to this property
        const newPropBalance = (parseFloat(existing.balance) + PROPERTY_START_BALANCE).toFixed(5);
        await tx.update(propertiesTable).set({ balance: newPropBalance }).where(eq(propertiesTable.id, propId));
      }
    });

    return res.json({
      action: "already_owned",
      propertyId: propId,
      isPopular: existing.isPopular,
      distributedTo,
      newBalance: parseFloat(newBuyerBalance),
      formattedBalance: formatBalance(newBuyerBalance),
    });
  } catch (err: any) {
    handleError(err, res, "Interact property error");
  }
});

// POST /api/properties/:id/sell — sell your property and receive its balance
router.post("/:id/sell", async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const propId = parseInt(req.params.id);
    if (isNaN(propId) || propId < 1 || propId > 100) {
      return res.status(400).json({ error: "Propiedad inválida" });
    }

    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propId)).limit(1);
    if (!prop || prop.ownerId !== userId) {
      return res.status(403).json({ error: "No sos el dueño de esta propiedad" });
    }

    const propBalance = parseFloat(prop.balance);
    let newUserBalance = "";

    await db.transaction(async (tx) => {
      await lockUsers(tx, userId);
      const [user] = await tx.select({ balance: usersTable.balance }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user) throw new AppError("Usuario no encontrado");

      newUserBalance = (parseFloat(user.balance) + propBalance).toFixed(5);
      await tx.update(usersTable).set({ balance: newUserBalance }).where(eq(usersTable.id, userId));
      await tx.insert(transactionsTable).values({
        userId,
        type: "ingreso",
        amount: propBalance.toFixed(5),
        description: `Venta de Propiedad #${propId}`,
      });
      await tx.delete(propertiesTable).where(eq(propertiesTable.id, propId));
    });

    return res.json({ earned: propBalance, newBalance: parseFloat(newUserBalance), formattedBalance: formatBalance(newUserBalance) });
  } catch (err: any) {
    handleError(err, res, "Sell property error");
  }
});

export default router;
