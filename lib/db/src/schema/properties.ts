import { pgTable, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const propertiesTable = pgTable("properties", {
  id: integer("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  balance: numeric("balance", { precision: 20, scale: 5 }).notNull().default("10.00000"),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  isPopular: boolean("is_popular").notNull().default(false),
});

export type Property = typeof propertiesTable.$inferSelect;
