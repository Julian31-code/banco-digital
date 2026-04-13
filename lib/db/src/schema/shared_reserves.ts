import { pgTable, serial, text, numeric, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const sharedReservesTable = pgTable("shared_reserves", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  balance: numeric("balance", { precision: 20, scale: 5 }).notNull().default("0.00000"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sharedReserveMembersTable = pgTable("shared_reserve_members", {
  sharedReserveId: integer("shared_reserve_id").notNull().references(() => sharedReservesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.sharedReserveId, t.userId] })]);

export const removeVotesTable = pgTable("remove_votes", {
  id: serial("id").primaryKey(),
  sharedReserveId: integer("shared_reserve_id").notNull().references(() => sharedReservesTable.id, { onDelete: "cascade" }),
  targetUserId: integer("target_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  voterUserId: integer("voter_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSharedReserveSchema = createInsertSchema(sharedReservesTable).omit({ id: true, createdAt: true });
export type InsertSharedReserve = z.infer<typeof insertSharedReserveSchema>;
export type SharedReserve = typeof sharedReservesTable.$inferSelect;
export type SharedReserveMember = typeof sharedReserveMembersTable.$inferSelect;
