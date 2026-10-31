import type {
  DashboardPayload,
  Timetable,
  TimetableDay,
  TimetableLesson,
} from "../shared/types.ts";
import type { Backend } from "./backend.ts";

export function londonParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(pick("hour")) % 24;
  const minute = Number(pick("minute"));

  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    dayName: pick("weekday"),
    hour,
    minute,
    minutes: hour * 60 + minute,
  };
}

export function mondayOf(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function lessonsOnly(day: TimetableDay | null | undefined): TimetableLesson[] {
  return (day?.lessons ?? []).filter((lesson) => lesson.kind === "lesson");
}

function findNext(timetable: Timetable, date: string, minutes: number): TimetableLesson | null {
  for (const day of timetable.days) {
    if (day.date < date) continue;
    for (const lesson of lessonsOnly(day)) {
      if (day.date === date && toMinutes(lesson.start) <= minutes) continue;
      return lesson;
    }
  }
  return null;
}

export async function computeDashboard(
  backend: Backend,
  now: Date,
  todayIso?: string,
): Promise<DashboardPayload> {
  const parts = londonParts(now);
  const date = todayIso ?? parts.date;
  const weekBeginning = mondayOf(date);

  const [timetable, points, reports, notices] = await Promise.all([
    backend.getTimetable(weekBeginning),
    backend.getPoints(),
    backend.getReports(),
    backend.getNotices(),
  ]);

  const today = timetable.days.find((day) => day.date === date) ?? null;
  const todayLessons = lessonsOnly(today);

  const currentLesson =
    todayLessons.find((lesson) => {
      const start = toMinutes(lesson.start);
      const end = toMinutes(lesson.end);
      return start >= 0 && end >= 0 && start <= parts.minutes && parts.minutes < end;
    }) ?? null;

  let nextLesson = findNext(timetable, date, parts.minutes);
  if (!nextLesson) {
    try {
      const nextWeek = await backend.getTimetable(addDays(weekBeginning, 7));
      nextLesson = findNext(nextWeek, addDays(date, 1), -1);
    } catch {
      nextLesson = null;
    }
  }

  return {
    user: backend.getUser(),
    today,
    currentLesson,
    nextLesson,
    points: points.summary,
    recentPoints: [...points.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    reports: reports.length,
    unread: notices.length,
    weekBeginning,
    nowIso: `${date}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
  };
}
