import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Expand, Minimize } from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState } from "../components/States";
import { toMinutes } from "../lib/format";
import type { TimetableDay, TimetableLesson } from "@shared/types";

const POLL_MS = 20_000;

type Phase = "running" | "before" | "after";

function periodLessons(today: TimetableDay | null): TimetableLesson[] {
  return (today?.lessons ?? []).filter((lesson) => {
    if (lesson.kind !== "lesson") return false;
    return toMinutes(lesson.start) >= 0 && toMinutes(lesson.end) > toMinutes(lesson.start);
  });
}

function pickLesson(
  today: TimetableDay | null,
  seconds: number,
): { lesson: TimetableLesson | null; phase: Phase } {
  const lessons = periodLessons(today);
  for (const lesson of lessons) {
    const start = toMinutes(lesson.start) * 60;
    const end = toMinutes(lesson.end) * 60;
    if (start <= seconds && seconds < end) return { lesson, phase: "running" };
  }
  const upcoming = lessons.find((lesson) => toMinutes(lesson.start) * 60 > seconds);
  if (upcoming) return { lesson: upcoming, phase: "before" };
  const last = lessons.length ? lessons[lessons.length - 1] : null;
  return { lesson: last, phase: "after" };
}

function clockLabel(time: string): string {
  const minutes = toMinutes(time);
  if (minutes < 0) return time;
  const hour24 = Math.floor(minutes / 60) % 24;
  const hour = hour24 % 12 || 12;
  const rest = String(minutes % 60).padStart(2, "0");
  return `${hour}:${rest}${hour24 < 12 ? "am" : "pm"}`;
}

function countdown(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = String(safe % 60).padStart(2, "0");
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
  return `${minutes}:${rest}`;
}

/** Seconds since midnight for an "HH:MM" time. */
function secondsOfDay(time: string): number {
  return toMinutes(time.slice(0, 5)) * 60;
}

/** The wall clock in the school's time zone, as seconds since midnight. */
function londonSeconds(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (pick("hour") % 24) * 3600 + pick("minute") * 60 + pick("second");
}

export function InClassPage() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(),
    refetchInterval: POLL_MS,
  });

  const [now, setNow] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // The server sends school time. When that clock is live we add the seconds
  // since the response arrived; when it is frozen (demo mode) we do not.
  const schoolSeconds = useMemo(() => {
    const iso = query.data?.nowIso;
    if (!iso) return londonSeconds();
    const base = secondsOfDay(iso.slice(11, 16));
    const real = londonSeconds();
    const drift = Math.abs(real - base);
    if (Math.min(drift, 86400 - drift) > 120) return base;
    return base + Math.max(0, Math.floor((now - query.dataUpdatedAt) / 1000));
  }, [query.data?.nowIso, query.dataUpdatedAt, now]);

  const { lesson, phase } = useMemo(
    () => pickLesson(query.data?.today ?? null, schoolSeconds),
    [query.data?.today, schoolSeconds],
  );

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen({ navigationUI: "hide" });
    } catch {
      // Browsers can refuse fullscreen (embedded frames, permissions).
    }
  }

  if (query.isPending) return <PageSkeleton />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  if (!lesson) {
    return (
      <div className="page">
        <EmptyState
          icon={<CalendarDays size={20} />}
          title="Nothing to time"
          description="There are no periods on today’s timetable."
        />
      </div>
    );
  }

  const start = secondsOfDay(lesson.start);
  const end = secondsOfDay(lesson.end);
  const length = Math.max(1, end - start);
  const percent = Math.min(100, Math.max(0, ((schoolSeconds - start) / length) * 100));
  const clock = phase === "running" ? end - schoolSeconds : phase === "before" ? start - schoolSeconds : 0;
  const label = phase === "running" ? "In class now" : phase === "before" ? "Coming up" : "Finished";

  return (
    <div className={`inclass ${fullscreen ? "is-fullscreen" : ""}`} ref={rootRef}>
      <header className="inclass-head">
        <div className="inclass-title">
          <p className="eyebrow">{label}</p>
          <h2>{lesson.subject}</h2>
          <p className="inclass-sub">
            {lesson.room ? `${lesson.room} · ` : ""}
            {clockLabel(lesson.start)} – {clockLabel(lesson.end)}
          </p>
        </div>
        <button
          type="button"
          className={fullscreen ? "icon-btn inclass-fs" : "btn btn-tonal btn-sm"}
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? "Exit fullscreen" : "Go fullscreen"}
          title={fullscreen ? "Exit fullscreen (Esc)" : "Go fullscreen"}
        >
          {fullscreen ? <Minimize size={18} /> : <Expand size={16} />}
          {fullscreen ? null : <span>Fullscreen</span>}
        </button>
      </header>

      <p className="inclass-percent" aria-live="polite">
        {Math.round(percent)}
        <span>%</span>
      </p>

      <div
        className="inclass-track"
        role="progressbar"
        aria-label={`${lesson.subject} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      <footer className="inclass-foot">
        <p className="inclass-meta">
          {lesson.period ? `Period ${lesson.period}` : lesson.subject}
          {lesson.teachers.length ? ` · ${lesson.teachers.join(", ")}` : ""}
        </p>
        <p className="inclass-clock">
          {phase === "after" ? "00:00" : countdown(clock)}
          <span className="inclass-clock-label">
            {phase === "running" ? "left" : phase === "before" ? "until start" : ""}
          </span>
        </p>
      </footer>
    </div>
  );
}
