export const DEFAULT_TZ = "Asia/Singapore";
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/**
 * Canonical weekday index used across the app:
 * 0 = Monday ... 6 = Sunday
 */
export const WEEKDAY_LABELS_ZH_SHORT_MON_FIRST = ["一", "二", "三", "四", "五", "六", "日"] as const;
export const WEEKDAY_LABELS_EN_MON_FIRST = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** JS day: 0=Sunday..6=Saturday -> app day: 0=Monday..6=Sunday */
export function jsDayToMonFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** app day: 0=Monday..6=Sunday -> JS day: 0=Sunday..6=Saturday */
export function monFirstIndexToJsDay(day: number): number {
  return (day + 1) % 7;
}

export const MONDAY_TO_FRIDAY_MON_FIRST = [0, 1, 2, 3, 4] as const;

export function nowInDefaultTZ(): Date {
  return new Date(Date.now() + TZ_OFFSET_MS);
}

export function getTodayYmdInDefaultTZ(): string {
  const now = nowInDefaultTZ();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export function parseYmdToUTCDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

export function formatYmdLabel(
  ymd: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return parseYmdToUTCDate(ymd).toLocaleDateString(locale, {
    ...options,
    timeZone: DEFAULT_TZ,
  });
}

export function getDaysInMonthUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
