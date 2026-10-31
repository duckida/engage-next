import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Users } from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState, Skeleton } from "../components/States";
import { dayNumber, formatLongDate, weekdayShort, durationLabel } from "../lib/format";
import { subjectStyle, subjectAbbreviation } from "../lib/subjects";
import type { Timetable, TimetableDay, TimetableLesson } from "@shared/types";

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function LessonCard({ lesson }: { lesson: TimetableLesson }) {
  const isBreak = lesson.kind !== "lesson";
  return (
    <li
      className={`lesson-card ${isBreak ? "is-break" : ""}`}
      style={subjectStyle(lesson.subject)}
    >
      <div className="lesson-card-time">
        <strong>{lesson.start}</strong>
        <span>{lesson.end}</span>
        <em>{durationLabel(lesson.start, lesson.end)}</em>
      </div>
      <div className="lesson-card-body">
        <span className="lesson-card-subject">{lesson.subject}</span>
        <span className="lesson-card-meta">
          {lesson.period ? <span className="pill">{lesson.period}</span> : null}
          {lesson.room ? (
            <span>
              <MapPin size={13} /> {lesson.room}
            </span>
          ) : null}
          {lesson.teachers.length ? (
            <span>
              <Users size={13} /> {lesson.teachers.join(", ")}
            </span>
          ) : null}
        </span>
      </div>
      <span className="lesson-card-mark" aria-hidden="true">
        {subjectAbbreviation(lesson.subject)}
      </span>
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
  const base = data?.weekBeginning ?? "2026-11-02";

  // Follow the dashboard clock (fixed in demo mode) so “today” matches the rest of the app.
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard(), staleTime: 30_000 });
  const todayIso = dashboard.data?.nowIso.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!data || week !== null) return;
    const index = data.days.findIndex((day) => day.date === todayIso);
    if (index >= 0) setSelectedDay(index);
  }, [data, week, todayIso]);

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
            aria-label="Previous week"
            onClick={() => {
              setWeek(addDays(base, -7));
              setSelectedDay(0);
            }}
            disabled={query.isFetching && !query.isPending}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-tonal btn-sm"
            onClick={() => {
              setWeek(null);
              void query.refetch();
            }}
          >
            This week
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next week"
            onClick={() => {
              setWeek(addDays(base, 7));
              setSelectedDay(0);
            }}
            disabled={query.isFetching && !query.isPending}
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
      ) : data ? (
        <>
          <div className="day-tabs" role="tablist" aria-label="Days">
            {data.days.map((day, index) => (
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

          <div className="day-grid">
            {data.days.map((day, index) => (
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
        </>
      ) : null}
    </div>
  );
}