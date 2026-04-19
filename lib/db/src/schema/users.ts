import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  balance: numeric("balance", { precision: 20, scale: 5 }).notNull().default("0.00000"),
  avatarUrl: text("avatar_url"),
  diamond: numeric("diamond", { precision: 20, scale: 5 }).notNull().default("0.00000"),
  ruby: numeric("ruby", { precision: 20, scale: 5 }).notNull().default("0.00000"),
  emerald: numeric("emerald", { precision: 20, scale: 5 }).notNull().default("0.00000"),
  legendaryJewel: numeric("legendary_jewel", { precision: 20, scale: 5 }).notNull().default("0.00000"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
