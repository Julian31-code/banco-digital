import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Generic key-value store for game state.
// Each row belongs to a user, a game, and a session (round/instance).
// Games can store anything: lottery tickets, pool deposits, scores, choices, etc.
//
// Examples:
//   sorteo  | navidad-2026  | user:3  | key:"numero"   | value:"42"
//   pozo    | sabado-noche  | user:5  | key:"deposito" | value:"50.00000"
//   trivia  | ronda-1       | user:3  | key:"puntaje"  | value:"850"

export const gameDataTable = pgTable("game_data", {
  id: serial("id").primaryKey(),
  gameName: text("game_name").notNull(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GameData = typeof gameDataTable.$inferSelect;
