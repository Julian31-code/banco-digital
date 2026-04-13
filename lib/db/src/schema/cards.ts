import { pgTable, serial, integer, numeric, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { tarjetasTable } from "./tarjetas";

export const cardsTable = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tarjetaId: integer("tarjeta_id").references(() => tarjetasTable.id, { onDelete: "set null" }),
  nombre: varchar("nombre", { length: 255 }),
  imagenUrl: varchar("imagen_url", { length: 1000 }),
  percentage: numeric("percentage", { precision: 5, scale: 2 }),
  hasCase: boolean("has_case").notNull().default(false),
  powerPoints: integer("power_points").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Card = typeof cardsTable.$inferSelect;
