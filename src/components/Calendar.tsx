import { WEEKDAY_LABELS_ZH_SHORT_MON_FIRST, jsDayToMonFirstIndex, getDaysInMonthUTC } from "../lib/datetime";

const MONTH_NAMES = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
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
  const firstDay = jsDayToMonFirstIndex(new Date(Date.UTC(year, month - 1, 1)).getUTCDay());
  const daysInMonth = getDaysInMonthUTC(year, month);

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
          class="text-slate-400 hover:text-slate-600 text-xl px-2 transition-colors"
        >
          &lt;
        </a>
        <span class="text-lg font-semibold text-slate-900">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <a
          href={`${baseUrl}?year=${nextYear}&month=${nextMonth}`}
          class="text-slate-400 hover:text-slate-600 text-xl px-2 transition-colors"
        >
          &gt;
        </a>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 font-medium mb-2">
        {WEEKDAY_LABELS_ZH_SHORT_MON_FIRST.map((d) => (
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
                class="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-sm shadow-sm"
              >
                {day}
              </a>
            );
          }
          if (isAvailable) {
            return (
              <a
                href={`${baseUrl}?year=${year}&month=${month}&date=${day}`}
                class="w-10 h-10 mx-auto flex items-center justify-center rounded-full text-indigo-600 font-semibold hover:bg-indigo-50 text-sm cursor-pointer transition-colors"
              >
                {day}
              </a>
            );
          }
          return (
            <div class="w-10 h-10 mx-auto flex items-center justify-center text-slate-300 text-sm">
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
