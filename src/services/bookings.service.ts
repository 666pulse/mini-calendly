import { db } from "../db/index";
import type { Booking, BookingWithEvent } from "./entities";

export function listRecent(limit = 50): BookingWithEvent[] {
  return db
    .query<BookingWithEvent, [number]>(
      `SELECT b.*, e.name as event_name FROM bookings b
       JOIN event_types e ON b.event_type_id = e.id
       ORDER BY b.start_time DESC LIMIT ?`
    )
    .all(limit);
}

export function findConflict(
  eventTypeId: number,
  startTime: string,
  endTime: string
): boolean {
  const row = db
    .query(
      "SELECT id FROM bookings WHERE event_type_id = ? AND start_time < ? AND end_time > ? AND status = 'confirmed'"
    )
    .get(eventTypeId, endTime, startTime);
  return !!row;
}

export function findByDateRange(
  eventTypeId: number,
  dayStart: string,
  dayEnd: string
): Pick<Booking, "start_time" | "end_time">[] {
  return db
    .query<Pick<Booking, "start_time" | "end_time">, [number, string, string]>(
      "SELECT start_time, end_time FROM bookings WHERE event_type_id = ? AND start_time >= ? AND start_time <= ? AND status = 'confirmed'"
    )
    .all(eventTypeId, dayStart, dayEnd);
}

export function create(data: {
  event_type_id: number;
  invitee_name: string;
  invitee_email: string;
  start_time: string;
  end_time: string;
  notes: string;
}): number {
  const result = db.run(
    `INSERT INTO bookings (event_type_id, invitee_name, invitee_email, start_time, end_time, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.event_type_id, data.invitee_name, data.invitee_email, data.start_time, data.end_time, data.notes]
  );
  return Number(result.lastInsertRowid);
}

export function cancel(id: number) {
  db.run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
}
