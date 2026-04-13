import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const tarjetasTable = pgTable("tarjetas", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  imagenUrl: varchar("imagen_url", { length: 1000 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Tarjeta = typeof tarjetasTable.$inferSelect;
