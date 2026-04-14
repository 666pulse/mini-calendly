const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function Calendar({
  year,
  month,
  availableDates,
  selectedDate,
  baseUrl,
}: {
  year: number;
  month: number; // 1-indexed
  availableDates: number[];
  selectedDate?: number;
  baseUrl: string;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const availableSet = new Set(availableDates);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <a
          href={`${baseUrl}?year=${prevYear}&month=${prevMonth}`}
          class="text-gray-400 hover:text-gray-600 text-xl px-2"
        >
          &lt;
        </a>
        <span class="text-lg font-semibold text-gray-900">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <a
          href={`${baseUrl}?year=${nextYear}&month=${nextMonth}`}
          class="text-gray-400 hover:text-gray-600 text-xl px-2"
        >
          &gt;
        </a>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 font-medium mb-2">
        {WEEKDAYS.map((d) => (
          <div class="py-1">{d}</div>
        ))}
      </div>

      <div class="grid grid-cols-7 gap-1 text-center">
        {cells.map((day) => {
          if (day === null) return <div />;

          const isAvailable = availableSet.has(day);
          const isSelected = day === selectedDate;

          if (isSelected) {
            return (
              <a
                href={`${baseUrl}?year=${year}&month=${month}&date=${day}`}
                class="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm"
              >
                {day}
              </a>
            );
          }
          if (isAvailable) {
            return (
              <a
                href={`${baseUrl}?year=${year}&month=${month}&date=${day}`}
                class="w-10 h-10 mx-auto flex items-center justify-center rounded-full text-blue-600 font-semibold hover:bg-blue-50 text-sm cursor-pointer"
              >
                {day}
              </a>
            );
          }
          return (
            <div class="w-10 h-10 mx-auto flex items-center justify-center text-gray-300 text-sm">
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
