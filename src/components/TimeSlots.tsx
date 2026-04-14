import type { TimeSlot } from "../lib/availability";

export function TimeSlots({
  slots,
  date,
  bookingUrl,
}: {
  slots: TimeSlot[];
  date: string; // YYYY-MM-DD
  bookingUrl: string;
}) {
  if (slots.length === 0) {
    return (
      <div class="text-gray-500 text-sm text-center py-8">
        No available times for this date.
      </div>
    );
  }

  return (
    <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
      {slots.map((slot) => (
        <a
          href={`${bookingUrl}?date=${date}&time=${slot.start}`}
          class="block w-full text-center py-3 px-4 border border-blue-600 text-blue-600 rounded-md font-semibold hover:bg-blue-600 hover:text-white transition-colors text-sm"
        >
          {slot.start}
        </a>
      ))}
    </div>
  );
}
