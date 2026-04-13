import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const reservesTable = pgTable("reserves", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  balance: numeric("balance", { precision: 20, scale: 5 }).notNull().default("0.00000"),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReserveSchema = createInsertSchema(reservesTable).omit({ id: true, createdAt: true });
export type InsertReserve = z.infer<typeof insertReserveSchema>;
export type Reserve = typeof reservesTable.$inferSelect;
