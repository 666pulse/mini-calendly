import * as EventTypesService from "../services/event-types.service";
import * as BookingsService from "../services/bookings.service";

export interface TimeSlot {
  start: string; // HH:mm
  end: string;
}

export function getAvailableSlots(
  eventTypeId: number,
  date: string, // YYYY-MM-DD
  durationMinutes: number,
): TimeSlot[] {
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat

  const availabilities = EventTypesService.getAvailabilityByDay(eventTypeId, dayOfWeek);
  if (availabilities.length === 0) return [];

  const dayStart = date + "T00:00:00";
  const dayEnd = date + "T23:59:59";
  const bookings = BookingsService.findByDateRange(eventTypeId, dayStart, dayEnd);

  const slots: TimeSlot[] = [];

  for (const avail of availabilities) {
    const [startH, startM] = avail.start_time.split(":").map(Number);
    const [endH, endM] = avail.end_time.split(":").map(Number);

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

      if (!hasConflict) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      currentMinutes += 30;
    }
  }

  return slots;
}

export function getAvailableDates(
  eventTypeId: number,
  year: number,
  month: number // 1-indexed
): number[] {
  const availabilities = EventTypesService.getAvailability(eventTypeId);
  const availableDays = new Set(availabilities.map((a) => a.day_of_week));
  const dates: number[] = [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date < today) continue;
    if (availableDays.has(date.getDay())) {
      dates.push(day);
    }
  }

  return dates;
}
