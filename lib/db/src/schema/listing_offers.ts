import { pgTable, serial, integer, numeric, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { cardListingsTable } from "./card_listings";

export const listingOffersTable = pgTable("listing_offers", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => cardListingsTable.id, { onDelete: "cascade" }),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 20, scale: 5 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ListingOffer = typeof listingOffersTable.$inferSelect;
