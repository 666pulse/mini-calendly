import type { DbAdapter } from "../db/adapter";
import type { Booking, BookingWithEvent } from "./entities";
import { emitAfterCreate, emitAfterUpdate } from "../lib/hooks";

export async function listRecent(db: DbAdapter, limit = 50) {
  return db.all<BookingWithEvent>(
    `SELECT b.*, e.name as event_name FROM bookings b
     JOIN event_types e ON b.event_type_id = e.id
     ORDER BY b.start_time DESC LIMIT ?`,
    [limit]
  );
}

export async function list(
  db: DbAdapter,
  filters: {
    event_type_id?: number;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { event_type_id, status, search, page = 1, pageSize = 20 } = filters;
  const where: string[] = [];
  const params: unknown[] = [];

  if (event_type_id) {
    where.push("b.event_type_id = ?");
    params.push(event_type_id);
  }
  if (status) {
    where.push("b.status = ?");
    params.push(status);
  }
  if (search) {
    where.push("(b.invitee_name LIKE ? OR b.invitee_email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const countRow = await db.get<{ total: number }>(
    `SELECT COUNT(*) as total FROM bookings b ${whereClause}`,
    params
  );
  const total = countRow?.total ?? 0;

  const offset = (page - 1) * pageSize;
  const rows = await db.all<BookingWithEvent>(
    `SELECT b.*, e.name as event_name FROM bookings b
     JOIN event_types e ON b.event_type_id = e.id
     ${whereClause}
     ORDER BY b.start_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function findById(db: DbAdapter, id: number) {
  return db.get<BookingWithEvent>(
    `SELECT b.*, e.name as event_name, e.host_name, e.duration_minutes, e.custom_fields
     FROM bookings b JOIN event_types e ON b.event_type_id = e.id WHERE b.id = ?`,
    [id]
  );
}

export async function findConflict(
  db: DbAdapter,
  eventTypeId: number,
  startTime: string,
  endTime: string
) {
  const row = await db.get(
    "SELECT id FROM bookings WHERE event_type_id = ? AND start_time < ? AND end_time > ? AND status = 'confirmed'",
    [eventTypeId, endTime, startTime]
  );
  return !!row;
}

export async function findByDateRange(
  db: DbAdapter,
  eventTypeId: number,
  dayStart: string,
  dayEnd: string
) {
  return db.all<Pick<Booking, "start_time" | "end_time">>(
    "SELECT start_time, end_time FROM bookings WHERE event_type_id = ? AND start_time >= ? AND start_time <= ? AND status = 'confirmed'",
    [eventTypeId, dayStart, dayEnd]
  );
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 24; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function create(
  db: DbAdapter,
  data: {
    event_type_id: number;
    invitee_name: string;
    invitee_email: string;
    start_time: string;
    end_time: string;
    notes: string;
    custom_data: string;
    meeting_id?: string;
    meeting_code?: string;
    meeting_url?: string;
  }
) {
  const cancel_token = generateToken();
  const result = await db.run(
    `INSERT INTO bookings (event_type_id, invitee_name, invitee_email, start_time, end_time, notes, custom_data, meeting_id, meeting_code, meeting_url, cancel_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.event_type_id, data.invitee_name, data.invitee_email, data.start_time, data.end_time, data.notes, data.custom_data, data.meeting_id || "", data.meeting_code || "", data.meeting_url || "", cancel_token]
  );
  await emitAfterCreate(db, "bookings", result.lastInsertRowid);
  return { id: result.lastInsertRowid, cancel_token };
}

export async function findByToken(db: DbAdapter, token: string) {
  return db.get<BookingWithEvent>(
    `SELECT b.*, e.name as event_name, e.slug, e.host_name, e.duration_minutes, e.meeting_provider
     FROM bookings b JOIN event_types e ON b.event_type_id = e.id WHERE b.cancel_token = ?`,
    [token]
  );
}

export async function cancel(db: DbAdapter, id: number, reason: string = "") {
  await db.run("UPDATE bookings SET status = 'cancelled', cancel_reason = ? WHERE id = ?", [reason, id]);
  await emitAfterUpdate(db, "bookings", id);
}

export async function confirm(db: DbAdapter, id: number) {
  await db.run("UPDATE bookings SET status = 'confirmed' WHERE id = ?", [id]);
  await emitAfterUpdate(db, "bookings", id);
}
