import type { DbAdapter } from "../db/adapter";
import type { EventType, Availability } from "./entities";
import { emitAfterCreate, emitAfterUpdate } from "../lib/hooks";

export async function findBySlug(db: DbAdapter, slug: string) {
  return db.get<EventType>("SELECT * FROM event_types WHERE slug = ?", [slug]);
}

export async function findById(db: DbAdapter, id: number) {
  return db.get<EventType>("SELECT * FROM event_types WHERE id = ?", [id]);
}

export async function listAll(db: DbAdapter) {
  return db.all<EventType>("SELECT * FROM event_types ORDER BY created_at DESC");
}

export async function listPublished(db: DbAdapter) {
  return db.all<EventType>("SELECT * FROM event_types WHERE published = 1 ORDER BY created_at DESC");
}

export async function create(
  db: DbAdapter,
  data: {
    slug: string;
    name: string;
    host_name: string;
    duration_minutes: number;
    description: string;
    custom_fields: string;
    meeting_provider: string;
    meeting_url: string;
    published: number;
    start_date: string | null;
    end_date: string | null;
  }
) {
  const result = await db.run(
    `INSERT INTO event_types (slug, name, host_name, duration_minutes, description, custom_fields, meeting_provider, meeting_url, published, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.slug, data.name, data.host_name, data.duration_minutes, data.description, data.custom_fields, data.meeting_provider, data.meeting_url, data.published, data.start_date, data.end_date]
  );
  await emitAfterCreate(db, "event_types", result.lastInsertRowid);
  return result.lastInsertRowid;
}

export async function update(
  db: DbAdapter,
  id: number,
  data: {
    name: string;
    host_name: string;
    duration_minutes: number;
    description: string;
    custom_fields: string;
    meeting_provider: string;
    meeting_url: string;
    published: number;
    start_date: string | null;
    end_date: string | null;
  }
) {
  await db.run(
    `UPDATE event_types SET name = ?, host_name = ?, duration_minutes = ?, description = ?, custom_fields = ?, meeting_provider = ?, meeting_url = ?, published = ?, start_date = ?, end_date = ? WHERE id = ?`,
    [data.name, data.host_name, data.duration_minutes, data.description, data.custom_fields, data.meeting_provider, data.meeting_url, data.published, data.start_date, data.end_date, id]
  );
  await emitAfterUpdate(db, "event_types", id);
}

export async function remove(db: DbAdapter, id: number) {
  await db.run("DELETE FROM event_types WHERE id = ?", [id]);
}

export async function getAvailability(db: DbAdapter, eventTypeId: number) {
  return db.all<Availability>("SELECT * FROM availability WHERE event_type_id = ?", [eventTypeId]);
}

export async function getAvailabilityByDay(db: DbAdapter, eventTypeId: number, dayOfWeek: number) {
  return db.all<Availability>(
    "SELECT * FROM availability WHERE event_type_id = ? AND day_of_week = ?",
    [eventTypeId, dayOfWeek]
  );
}

export async function replaceAvailability(
  db: DbAdapter,
  eventTypeId: number,
  slots: { day_of_week: number; start_time: string; end_time: string }[]
) {
  await db.run("DELETE FROM availability WHERE event_type_id = ?", [eventTypeId]);
  for (const slot of slots) {
    await db.run(
      `INSERT INTO availability (event_type_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`,
      [eventTypeId, slot.day_of_week, slot.start_time, slot.end_time]
    );
  }
}
