import { db } from "../db/index";
import type { EventType, Availability } from "./entities";

export function findBySlug(slug: string): EventType | null {
  return db
    .query<EventType, [string]>("SELECT * FROM event_types WHERE slug = ?")
    .get(slug);
}

export function findById(id: number): EventType | null {
  return db
    .query<EventType, [number]>("SELECT * FROM event_types WHERE id = ?")
    .get(id);
}

export function listAll(): EventType[] {
  return db
    .query<EventType, []>("SELECT * FROM event_types ORDER BY created_at DESC")
    .all();
}

export function create(data: {
  slug: string;
  name: string;
  host_name: string;
  duration_minutes: number;
  description: string;
  custom_fields: string;
}): number {
  const result = db.run(
    `INSERT INTO event_types (slug, name, host_name, duration_minutes, description, custom_fields) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.slug, data.name, data.host_name, data.duration_minutes, data.description, data.custom_fields]
  );
  return Number(result.lastInsertRowid);
}

export function update(
  id: number,
  data: {
    slug: string;
    name: string;
    host_name: string;
    duration_minutes: number;
    description: string;
    custom_fields: string;
  }
) {
  db.run(
    `UPDATE event_types SET slug = ?, name = ?, host_name = ?, duration_minutes = ?, description = ?, custom_fields = ? WHERE id = ?`,
    [data.slug, data.name, data.host_name, data.duration_minutes, data.description, data.custom_fields, id]
  );
}

export function remove(id: number) {
  db.run("DELETE FROM event_types WHERE id = ?", [id]);
}

export function getAvailability(eventTypeId: number): Availability[] {
  return db
    .query<Availability, [number]>("SELECT * FROM availability WHERE event_type_id = ?")
    .all(eventTypeId);
}

export function getAvailabilityByDay(eventTypeId: number, dayOfWeek: number): Availability[] {
  return db
    .query<Availability, [number, number]>(
      "SELECT * FROM availability WHERE event_type_id = ? AND day_of_week = ?"
    )
    .all(eventTypeId, dayOfWeek);
}

export function replaceAvailability(
  eventTypeId: number,
  slots: { day_of_week: number; start_time: string; end_time: string }[]
) {
  db.run("DELETE FROM availability WHERE event_type_id = ?", [eventTypeId]);
  for (const slot of slots) {
    db.run(
      `INSERT INTO availability (event_type_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`,
      [eventTypeId, slot.day_of_week, slot.start_time, slot.end_time]
    );
  }
}
