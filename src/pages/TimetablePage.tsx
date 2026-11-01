import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState, Skeleton } from "../components/States";
import { dayNumber, formatLongDate, weekdayShort } from "../lib/format";
import { subjectStyle } from "../lib/subjects";
import type { Timetable, TimetableDay, TimetableLesson } from "@shared/types";

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing the given date (or today). */
function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function mondayOfIso(iso: string): string {
  return mondayOf(new Date(`${iso}T00:00:00Z`));
}

function clampDayIndex(days: TimetableDay[], index: number): number {
  if (!days.length) return 0;
  return Math.max(0, Math.min(index, days.length - 1));
}

function isWeekday(day: TimetableDay): boolean {
  const date = new Date(`${day.date}T00:00:00Z`);
  const weekday = date.getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

function timeRange(lesson: TimetableLesson): string {
  if (lesson.start && lesson.end) return `${lesson.start}–${lesson.end}`;
  return lesson.start || lesson.end || "All day";
}

function LessonCard({ lesson }: { lesson: TimetableLesson }) {
  const isBreak = lesson.kind !== "lesson";
  return (
    <li
      className={`lesson-card ${isBreak ? "is-break" : ""}`}
      style={subjectStyle(lesson.subject)}
    >
      <div className="lesson-card-body">
        <time className="lesson-card-time">{timeRange(lesson)}</time>
        <span className="lesson-card-subject">{lesson.subject}</span>
        <span className="lesson-card-meta">
          {lesson.teachers.length ? (
            <span className="lesson-card-teacher">{lesson.teachers.join(", ")}</span>
          ) : null}
          {lesson.room ? (
            <span className="lesson-card-room">{lesson.room}</span>
          ) : null}
        </span>
      </div>
    </li>
  );
}

function DayColumn({
  day,
  todayIso,
  selected,
  onSelect,
}: {
  day: TimetableDay;
  todayIso: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isToday = day.date === todayIso;
  const lessons = day.lessons;

  return (
    <section className={`day-col ${selected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}>
      <header className="day-head" onClick={onSelect}>
        <span className="day-name">{weekdayShort(day.date)}</span>
        <span className="day-num">{dayNumber(day.date)}</span>
        {isToday ? <span className="today-dot" aria-label="Today" /> : null}
        <span className="day-count">{lessons.length ? `${lessons.length} items` : "—"}</span>
      </header>

      {day.note ? (
        <p className="day-note">
          <CalendarDays size={15} /> {day.note}
        </p>
      ) : null}

      {lessons.length ? (
        <ol className="lesson-stack">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </ol>
      ) : !day.note ? (
        <EmptyState
          icon={<CalendarDays size={20} />}
          title="No lessons"
          description="This day is clear."
        />
      ) : null}
    </section>
  );
}

export function TimetablePage() {
  const [week, setWeek] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  const query = useQuery({
    queryKey: ["timetable", week ?? "current"],
    queryFn: () => api.timetable(week ?? undefined),
  });

  const data: Timetable | undefined = query.data;
  const visibleDays = useMemo(() => data?.days.filter(isWeekday) ?? [], [data]);
  const isEmptyWeek =
    !!data &&
    visibleDays.every((d) => d.lessons.filter((l) => l.kind === "lesson").length === 0);
  const holidayNote =
    visibleDays.map((d) => d.note).find((n) => !!n) ??
    visibleDays.flatMap((d) => d.lessons).find((l) => l.kind === "event")?.subject ??
    null;

  // Navigate from the last known week, or the week we asked for, or this week.
  // Never from a hard-coded date, and never blocked by a failed load.
  const [requestedWeek, setRequestedWeek] = useState<string>(() => mondayOf(new Date()));
  const base = data?.weekBeginning ?? requestedWeek;

  const moveDay = (direction: -1 | 1) => {
    if (!visibleDays.length) {
      setRequestedWeek(addDays(base, direction * 7));
      setWeek(addDays(base, direction * 7));
      setSelectedDay(direction > 0 ? 0 : Number.MAX_SAFE_INTEGER);
      return;
    }

    const nextIndex = selectedDay + direction;
    if (nextIndex >= 0 && nextIndex < visibleDays.length) {
      setSelectedDay(nextIndex);
      return;
    }

    const nextWeek = addDays(data?.weekBeginning ?? base, direction * 7);
    setRequestedWeek(nextWeek);
    setWeek(nextWeek);
    setSelectedDay(direction > 0 ? 0 : Number.MAX_SAFE_INTEGER);
  };

  // Follow the dashboard clock (fixed in demo mode) so “today” matches the rest of the app.
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard(), staleTime: 30_000 });
  const todayIso = dashboard.data?.nowIso.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!data || week !== null) return;
    const index = visibleDays.findIndex((day) => day.date === todayIso);
    if (index >= 0) setSelectedDay(index);
  }, [data, visibleDays, week, todayIso]);

  useEffect(() => {
    if (!data) return;
    setSelectedDay((index) => clampDayIndex(visibleDays, index));
  }, [data, visibleDays]);

  const goToday = () => {
    const thisWeek = mondayOfIso(todayIso);
    setRequestedWeek(thisWeek);
    setWeek(null);
    const index = data?.weekBeginning === thisWeek ? visibleDays.findIndex((day) => day.date === todayIso) : -1;
    setSelectedDay(index >= 0 ? index : 0);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Week beginning {data ? formatLongDate(data.weekBeginning) : ""}</p>
          <h1>Timetable</h1>
        </div>

        <div className="week-nav">
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous day"
            title="Previous day"
            onClick={() => moveDay(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-tonal btn-sm"
            onClick={goToday}
          >
            Today
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next day"
            title="Next day"
            onClick={() => moveDay(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {query.isPending ? (
        <div className="day-grid" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="day-col">
              <Skeleton className="skeleton-eyebrow" />
              {Array.from({ length: 4 }).map((__, row) => (
                <Skeleton key={row} className="skeleton-row" style={{ height: 84 }} />
              ))}
            </div>
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : data && visibleDays.length ? (
        <>
          <div className="day-tabs" role="tablist" aria-label="Days">
            {visibleDays.map((day, index) => (
              <button
                key={day.date}
                type="button"
                role="tab"
                aria-selected={selectedDay === index}
                className={`day-tab ${selectedDay === index ? "is-active" : ""} ${
                  day.date === todayIso ? "is-today" : ""
                }`}
                onClick={() => setSelectedDay(index)}
              >
                <span>{weekdayShort(day.date)}</span>
                <strong>{dayNumber(day.date)}</strong>
              </button>
            ))}
          </div>

          {isEmptyWeek ? (
            <div className="holiday-card">
              <span className="holiday-icon">
                <CalendarDays size={26} strokeWidth={1.7} />
              </span>
              <div>
                <h2>{holidayNote || "No lessons this week"}</h2>
                <p>
                  Week beginning {formatLongDate(data.weekBeginning)} has no lessons scheduled. Use
                  the day arrows or pick a date above to move around.
                </p>
              </div>
            </div>
          ) : (
            <div className="day-grid">
              {visibleDays.map((day, index) => (
                <div key={day.date} className={`day-slot ${selectedDay === index ? "is-open" : ""}`}>
                  <DayColumn
                    day={day}
                    todayIso={todayIso}
                    selected={selectedDay === index}
                    onSelect={() => setSelectedDay(index)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<CalendarDays size={20} />}
          title="No timetable for this week"
          description="The portal returned no days for this week. Try another week, or reload."
          action={
            <button type="button" className="btn btn-tonal" onClick={() => void query.refetch()}>
              Reload
            </button>
          }
        />
      )}
    </div>
  );
}
