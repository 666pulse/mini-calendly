import type { DbAdapter } from "../db/adapter";
import * as EventTypesService from "../services/event-types.service";
import * as BookingsService from "../services/bookings.service";
import { jsDayToMonFirstIndex } from "./week";

export const DEFAULT_TZ = "Asia/Singapore";
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/** Get "now" in the default timezone */
function nowInTZ(): Date {
  return new Date(Date.now() + TZ_OFFSET_MS);
}

export interface TimeSlot {
  start: string; // HH:mm
  end: string;
}

export async function getAvailableSlots(
  db: DbAdapter,
  eventTypeId: number,
  date: string, // YYYY-MM-DD
  durationMinutes: number,
): Promise<TimeSlot[]> {
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = jsDayToMonFirstIndex(dateObj.getDay());

  const availabilities = await EventTypesService.getAvailabilityByDay(db, eventTypeId, dayOfWeek);
  if (availabilities.length === 0) return [];

  const dayStart = date + "T00:00:00";
  const dayEnd = date + "T23:59:59";
  const bookings = await BookingsService.findByDateRange(db, eventTypeId, dayStart, dayEnd);
  const now = nowInTZ();
  const nowDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const isToday = date === nowDateStr;

  const slots: TimeSlot[] = [];

  for (const avail of availabilities) {
    const startH = Number(avail.start_time.slice(0, 2));
    const startM = Number(avail.start_time.slice(3, 5));
    const endH = Number(avail.end_time.slice(0, 2));
    const endM = Number(avail.end_time.slice(3, 5));

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + durationMinutes;
      const slotEndH = Math.floor(slotEndMinutes / 60);
      const slotEndM = slotEndMinutes % 60;

      const slotStart = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
      const slotEnd = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

      const slotStartISO = `${date}T${slotStart}:00`;
      const slotEndISO = `${date}T${slotEnd}:00`;

      const hasConflict = bookings.some((b) => {
        return b.start_time < slotEndISO && b.end_time > slotStartISO;
      });

      if (!hasConflict && (!isToday || currentMinutes >= nowMinutes)) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      currentMinutes += 30;
    }
  }

  return slots;
}

export async function getAvailableDates(
  db: DbAdapter,
  eventTypeId: number,
  year: number,
  month: number,
  startDate?: string | null,
  endDate?: string | null,
): Promise<number[]> {
  const availabilities = await EventTypesService.getAvailability(db, eventTypeId);
  const availableDays = new Set(availabilities.map((a) => a.day_of_week));
  const dates: number[] = [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = nowInTZ();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const rangeStart = startDate ? new Date(startDate + "T00:00:00Z") : null;
  const rangeEnd = endDate ? new Date(endDate + "T23:59:59Z") : null;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date < today) continue;
    if (rangeStart && date < rangeStart) continue;
    if (rangeEnd && date > rangeEnd) continue;
    if (availableDays.has(jsDayToMonFirstIndex(date.getUTCDay()))) {
      dates.push(day);
    }
  }

  return dates;
}
