export type AnalyticsPreset = "today" | "7d" | "30d" | "custom";

export type AnalyticsDateRange = {
  from: Date;
  fromDate: string;
  label: string;
  preset: AnalyticsPreset;
  to: Date;
  toDate: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NEPAL_OFFSET = "+05:45";

function nepalDateKey(date: Date) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Asia/Kathmandu", year: "numeric" }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function validDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function nepalStart(value: string) {
  return new Date(`${value}T00:00:00${NEPAL_OFFSET}`);
}

export function getAnalyticsDateRange(searchParams: Record<string, string | string[] | undefined>, now = new Date()): AnalyticsDateRange {
  const requested = typeof searchParams.range === "string" ? searchParams.range : "30d";
  const preset: AnalyticsPreset = ["today", "7d", "30d", "custom"].includes(requested) ? requested as AnalyticsPreset : "30d";
  const today = nepalDateKey(now);

  if (preset === "custom" && validDateKey(searchParams.from) && validDateKey(searchParams.to)) {
    const from = nepalStart(searchParams.from);
    const to = nepalStart(shiftDateKey(searchParams.to, 1));
    if (from < to && to.getTime() - from.getTime() <= 367 * 86_400_000) return { from, fromDate: searchParams.from, label: `${searchParams.from} – ${searchParams.to}`, preset, to, toDate: searchParams.to };
  }

  const safePreset: AnalyticsPreset = preset === "custom" ? "30d" : preset;
  const days = safePreset === "today" ? 1 : safePreset === "7d" ? 7 : 30;
  const fromDate = shiftDateKey(today, -(days - 1));
  return { from: nepalStart(fromDate), fromDate, label: safePreset === "today" ? "Today" : `Last ${days} days`, preset: safePreset, to: now, toDate: today };
}
