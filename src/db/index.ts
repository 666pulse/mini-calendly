import { Database } from "bun:sqlite";
import { join } from "path";

const dbPath = join(import.meta.dir, "../../db/data.db");
export const db = new Database(dbPath, { create: true });

// Enable WAL mode for better performance
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

export function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      host_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#0069ff',
      custom_fields TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: add custom_fields if missing
  const cols = db.query<{ name: string }, []>("PRAGMA table_info(event_types)").all();
  if (!cols.find((c) => c.name === "custom_fields")) {
    db.run("ALTER TABLE event_types ADD COLUMN custom_fields TEXT DEFAULT '[]'");
  }

  // Migration: add custom_data if missing
  const bCols = db.query<{ name: string }, []>("PRAGMA table_info(bookings)").all();
  if (!bCols.find((c) => c.name === "custom_data")) {
    db.run("ALTER TABLE bookings ADD COLUMN custom_data TEXT DEFAULT '{}'");
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type_id INTEGER NOT NULL,
      invitee_name TEXT NOT NULL,
      invitee_email TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_bookings_event_time
    ON bookings(event_type_id, start_time, end_time)
  `);
}
