import type { DbAdapter } from "./adapter";

export async function initSchema(db: DbAdapter) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      host_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#0069ff',
      custom_fields TEXT DEFAULT '[]',
      meeting_provider TEXT DEFAULT 'none',
      meeting_url TEXT DEFAULT '',
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type_id INTEGER NOT NULL,
      invitee_name TEXT NOT NULL,
      invitee_email TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled')),
      cancel_reason TEXT DEFAULT '',
      cancel_token TEXT DEFAULT '',
      meeting_id TEXT DEFAULT '',
      meeting_code TEXT DEFAULT '',
      meeting_url TEXT DEFAULT '',
      custom_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookings_event_time
    ON bookings(event_type_id, start_time, end_time)
  `);

  // Migrations
  const etCols = await db.all<{ name: string }>("PRAGMA table_info(event_types)");
  if (!etCols.find((c) => c.name === "custom_fields")) {
    await db.run("ALTER TABLE event_types ADD COLUMN custom_fields TEXT DEFAULT '[]'");
  }
  if (!etCols.find((c) => c.name === "start_date")) {
    await db.run("ALTER TABLE event_types ADD COLUMN start_date TEXT");
  }
  if (!etCols.find((c) => c.name === "end_date")) {
    await db.run("ALTER TABLE event_types ADD COLUMN end_date TEXT");
  }
  if (!etCols.find((c) => c.name === "updated_at")) {
    await db.run("ALTER TABLE event_types ADD COLUMN updated_at TEXT");
  }
  if (!etCols.find((c) => c.name === "meeting_url")) {
    await db.run("ALTER TABLE event_types ADD COLUMN meeting_url TEXT DEFAULT ''");
  }
  if (!etCols.find((c) => c.name === "meeting_provider")) {
    await db.run("ALTER TABLE event_types ADD COLUMN meeting_provider TEXT DEFAULT 'none'");
  }

  const bCols = await db.all<{ name: string }>("PRAGMA table_info(bookings)");
  if (!bCols.find((c) => c.name === "custom_data")) {
    await db.run("ALTER TABLE bookings ADD COLUMN custom_data TEXT DEFAULT '{}'");
  }
  if (!bCols.find((c) => c.name === "updated_at")) {
    await db.run("ALTER TABLE bookings ADD COLUMN updated_at TEXT");
  }
  if (!bCols.find((c) => c.name === "cancel_reason")) {
    await db.run("ALTER TABLE bookings ADD COLUMN cancel_reason TEXT DEFAULT ''");
  }
  if (!bCols.find((c) => c.name === "meeting_id")) {
    await db.run("ALTER TABLE bookings ADD COLUMN meeting_id TEXT DEFAULT ''");
  }
  if (!bCols.find((c) => c.name === "meeting_code")) {
    await db.run("ALTER TABLE bookings ADD COLUMN meeting_code TEXT DEFAULT ''");
  }
  if (!bCols.find((c) => c.name === "meeting_url")) {
    await db.run("ALTER TABLE bookings ADD COLUMN meeting_url TEXT DEFAULT ''");
  }
  if (!bCols.find((c) => c.name === "cancel_token")) {
    await db.run("ALTER TABLE bookings ADD COLUMN cancel_token TEXT DEFAULT ''");
  }

  const aCols = await db.all<{ name: string }>("PRAGMA table_info(availability)");
  if (!aCols.find((c) => c.name === "created_at")) {
    await db.run("ALTER TABLE availability ADD COLUMN created_at TEXT");
  }
  if (!aCols.find((c) => c.name === "updated_at")) {
    await db.run("ALTER TABLE availability ADD COLUMN updated_at TEXT");
  }
}
