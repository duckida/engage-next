const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const shortFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

const monthShortFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });

function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format only when the date is real; Intl throws on invalid dates. */
function safe(format: Intl.DateTimeFormat, iso: string, fallback = ""): string {
  const date = parseIso(iso);
  return date ? format.format(date) : fallback;
}

export function formatLongDate(iso: string): string {
  return safe(dateFormatter, iso);
}

export function formatShortDate(iso: string): string {
  return safe(shortFormatter, iso);
}

export function formatMonth(iso: string): string {
  if (!iso) return "";
  return safe(monthFormatter, iso.length > 7 ? iso : `${iso}-01`);
}

export function formatMonthShort(iso: string): string {
  if (!iso) return "";
  return safe(monthShortFormatter, iso.length > 7 ? iso : `${iso}-01`);
}

export function dayNumber(iso: string): string {
  const date = parseIso(iso);
  return date ? String(date.getDate()) : "–";
}

export function weekdayShort(iso: string): string {
  return safe(new Intl.DateTimeFormat("en-GB", { weekday: "short" }), iso, "—");
}

export function relativeDate(iso: string, todayIso?: string): string {
  if (!iso) return "";
  const date = parseIso(iso);
  if (!date) return "";
  const today = (todayIso ? parseIso(todayIso) : null) ?? new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((start.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return formatShortDate(iso);
}

export function greeting(nowIso?: string): string {
  const hour = nowIso ? Number(nowIso.slice(11, 13)) : new Date().getHours();
  if (!Number.isFinite(hour)) return "Hello";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function toMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function timeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

export function durationLabel(start: string, end: string): string {
  const minutes = toMinutes(end) - toMinutes(start);
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function surnameFirst(name: string): string {
  if (!name.includes(",")) return name;
  const [surname, rest] = name.split(",");
  return `${rest.trim()} ${surname.trim()}`.trim();
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function termRange(): { from: string; to: string } {
  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${startYear}-09-01`, to: todayIso() };
}
