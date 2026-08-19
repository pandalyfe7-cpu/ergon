/** Cookie holding the browser's IANA time zone, written by TimeZoneSync. */
export const TIME_ZONE_COOKIE = "tz";
export const FALLBACK_TIME_ZONE = "UTC";

/** The zone comes from a cookie, so it is untrusted input. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export type DayWindow = {
  /** Inclusive start of the local day, as a UTC instant. */
  start: Date;
  /** Exclusive end of the local day, as a UTC instant. */
  end: Date;
  /** The local date, YYYY-MM-DD. */
  date: string;
};

/**
 * The current local day as a pair of UTC instants, so "today" means the user's
 * day rather than the server's. Uses the zone's offset at `now`, which is only
 * inexact within a few hours of a daylight saving transition.
 */
export function dayWindow(timeZone: string, now: Date = new Date()): DayWindow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "longOffset",
  }).formatToParts(now);

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  const zoneName = part("timeZoneName");
  const offset = zoneName.length > 3 ? zoneName.slice(3) : "+00:00";

  const start = new Date(`${date}T00:00:00${offset}`);
  return { start, end: new Date(start.getTime() + 86_400_000), date };
}

/** Monday is 0, matching the week the body tab reports on. */
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** The zone's UTC offset on a given local date, as "+HH:MM". */
function offsetOn(timeZone: string, date: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(`${date}T12:00:00Z`));

  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return name.length > 3 ? name.slice(3) : "+00:00";
}

function localMidnight(timeZone: string, date: string): Date {
  return new Date(`${date}T00:00:00${offsetOn(timeZone, date)}`);
}

/** Shifts a YYYY-MM-DD calendar date by whole days. Noon anchor dodges DST. */
export function shiftDate(date: string, days: number): string {
  const anchor = new Date(`${date}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

/**
 * The local calendar date an instant falls on, YYYY-MM-DD. This is how rows are
 * bucketed into days: a meal eaten at 11pm belongs to that evening, not to the
 * next UTC day.
 */
export function localDate(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** The last `days` local calendar dates ending today, oldest first. */
export function recentDays(timeZone: string, days: number, now: Date = new Date()): string[] {
  const today = localDate(timeZone, now);
  return Array.from({ length: days }, (_, index) => shiftDate(today, index - days + 1));
}

export type WeekWindow = {
  /** Inclusive local Monday 00:00, as a UTC instant. */
  start: Date;
  /** Exclusive local Monday 00:00 seven days later, as a UTC instant. */
  end: Date;
  /** The Monday's local date, YYYY-MM-DD. */
  date: string;
};

/**
 * A Monday-to-Sunday week as UTC instants. `weeksAgo` counts back from the
 * week containing `now`, so 0 is the current week.
 */
export function weekWindow(
  timeZone: string,
  weeksAgo = 0,
  now: Date = new Date(),
): WeekWindow {
  const today = dayWindow(timeZone, now).date;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);

  const monday = shiftDate(today, -(WEEKDAY_INDEX[weekday] ?? 0) - 7 * weeksAgo);

  return {
    start: localMidnight(timeZone, monday),
    end: localMidnight(timeZone, shiftDate(monday, 7)),
    date: monday,
  };
}

/** "Jul 27" for a local calendar date, with no year. */
export function formatMonthDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** "Jul 27 - Aug 2" for one week. */
export function formatWeekRange(week: WeekWindow): string {
  return `${formatMonthDay(week.date)} \u2013 ${formatMonthDay(shiftDate(week.date, 6))}`;
}

export function formatWeekday(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);
}

/** Elapsed time as H:MM:SS, or M:SS under an hour. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
