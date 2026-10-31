import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  Sparkles,
  MapPin,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState } from "../components/States";
import {
  durationLabel,
  formatLongDate,
  formatShortDate,
  greeting,
  relativeDate,
  timeRange,
} from "../lib/format";
import { subjectStyle, subjectAbbreviation } from "../lib/subjects";
import type { TimetableLesson } from "@shared/types";

function LessonLine({ lesson, live = false }: { lesson: TimetableLesson; live?: boolean }) {
  const isBreak = lesson.kind !== "lesson";
  return (
    <li className={`lesson-row ${live ? "is-live" : ""} ${isBreak ? "is-break" : ""}`} style={subjectStyle(lesson.subject)}>
      <span className="lesson-time">
        <strong>{lesson.start}</strong>
        <span>{lesson.end}</span>
      </span>
      <span className="lesson-dot" aria-hidden="true" />
      <span className="lesson-body">
        <span className="lesson-subject">{lesson.subject}</span>
        <span className="lesson-meta">
          {lesson.period ? `${lesson.period} · ` : ""}
          {lesson.room ?? "Room tbc"}
          {lesson.teachers.length ? ` · ${lesson.teachers.join(", ")}` : ""}
        </span>
      </span>
      <span className="lesson-duration">{durationLabel(lesson.start, lesson.end)}</span>
    </li>
  );
}

export function HomePage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard() });

  if (query.isPending) return <PageSkeleton />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;
  if (!data) return null;

  const today = data.today;
  const lessons = today?.lessons ?? [];
  const doneCount = data.currentLesson
    ? lessons.filter((lesson) => lesson.end <= data.nowIso.slice(11, 16)).length
    : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatLongDate(data.nowIso.slice(0, 10))}</p>
          <h1>
            {greeting(data.nowIso)}, {data.user.firstName}
          </h1>
        </div>
        <Link to="/timetable" className="btn btn-text hide-mobile">
          Full timetable <ArrowRight size={16} />
        </Link>
      </header>

      <section className="hero-card">
        <div className="hero-status">
          {data.currentLesson ? (
            <>
              <span className="pulse" aria-hidden="true" />
              <span className="hero-label">Happening now</span>
              <span className="hero-chip" style={subjectStyle(data.currentLesson.subject)}>
                {data.currentLesson.subject}
              </span>
              <span className="hero-time">
                {timeRange(data.currentLesson.start, data.currentLesson.end)}
              </span>
            </>
          ) : today?.note ? (
            <>
              <span className="hero-label">{today.note}</span>
            </>
          ) : (
            <>
              <span className="hero-label">
                {lessons.length ? "No lesson right now" : "No school today"}
              </span>
            </>
          )}
        </div>

        <div className="hero-main">
          {data.currentLesson ? (
            <>
              <h2>{data.currentLesson.subject}</h2>
              <p className="hero-place">
                <MapPin size={15} />
                {data.currentLesson.room ?? "Room tbc"}
                {data.currentLesson.teachers.length
                  ? ` · ${data.currentLesson.teachers.join(", ")}`
                  : ""}
              </p>
            </>
          ) : data.nextLesson ? (
            <>
              <p className="hero-kicker">Up next</p>
              <h2>{data.nextLesson.subject}</h2>
              <p className="hero-place">
                <CalendarDays size={15} />
                {timeRange(data.nextLesson.start, data.nextLesson.end)} ·{" "}
                {data.nextLesson.room ?? "Room tbc"}
              </p>
            </>
          ) : (
            <>
              <h2>{today?.note ?? "Enjoy the day off"}</h2>
              <p className="hero-place">
                {lessons.length ? `${lessons.length} periods scheduled` : "Nothing scheduled"}
              </p>
            </>
          )}
        </div>

        <div className="hero-progress">
          <div className="hero-progress-track">
            <span
              style={{
                width: `${lessons.length ? Math.min(100, (doneCount / lessons.length) * 100) : 0}%`,
              }}
            />
          </div>
          <span>
            {doneCount}/{lessons.length} periods done
          </span>
        </div>
      </section>

      <section className="stat-grid">
        <Link to="/merits" className="stat-card accent-positive">
          <span className="stat-icon">
            <Sparkles size={18} />
          </span>
          <span className="stat-value">{data.points.positive}</span>
          <span className="stat-label">Merits this year</span>
          <span className="stat-delta">{data.points.total > 0 ? `Net +${data.points.total}` : "Net even"}</span>
        </Link>
        <Link to="/notices" className="stat-card">
          <span className="stat-icon">
            <Bell size={18} />
          </span>
          <span className="stat-value">{data.unread}</span>
          <span className="stat-label">Notices</span>
          <span className="stat-delta">Latest {data.unread ? "unread" : "read"}</span>
        </Link>
        <Link to="/reports" className="stat-card">
          <span className="stat-icon">
            <FileText size={18} />
          </span>
          <span className="stat-value">{data.reports}</span>
          <span className="stat-label">Reports</span>
          <span className="stat-delta">All years</span>
        </Link>
      </section>

      <div className="split">
        <section className="card">
          <header className="card-head">
            <div>
              <h2>Today</h2>
              <p className="card-sub">{formatShortDate(today?.date ?? data.nowIso.slice(0, 10))}</p>
            </div>
            <Link to="/timetable" className="icon-btn" aria-label="Open timetable">
              <ChevronRight size={18} />
            </Link>
          </header>

          {lessons.length ? (
            <ol className="lesson-list">
              {lessons.map((lesson) => (
                <LessonLine
                  key={lesson.id}
                  lesson={lesson}
                  live={data.currentLesson?.id === lesson.id}
                />
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={<CalendarDays size={20} />}
              title={today?.note ?? "No lessons today"}
              description="Check the week view to see what’s coming."
            />
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h2>Recent merits</h2>
              <p className="card-sub">
                {formatShortDate(data.points.from)} – {formatShortDate(data.points.to)}
              </p>
            </div>
            <Link to="/merits" className="icon-btn" aria-label="Open merits">
              <ChevronRight size={18} />
            </Link>
          </header>

          {data.recentPoints.length ? (
            <ul className="point-list">
              {data.recentPoints.map((entry) => (
                <li key={entry.id} className="point-row">
                  <span className={`point-badge ${entry.points >= 0 ? "is-positive" : "is-negative"}`}>
                    {entry.points >= 0 ? `+${entry.points}` : entry.points}
                  </span>
                  <span className="point-body">
                    <span className="point-title">{entry.category || entry.type}</span>
                    <span className="point-note">{entry.notes || entry.awardedBy}</span>
                  </span>
                  <time className="point-date">{relativeDate(entry.date, data.nowIso.slice(0, 10))}</time>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No merits yet" description="Merits awarded this term will appear here." />
          )}
        </section>
      </div>

      <section className="quick-row">
        <Link to="/timetable" className="quick-card">
          <CalendarDays size={18} />
          <span>Week ahead</span>
          <ArrowRight size={15} />
        </Link>
        <Link to="/reports" className="quick-card">
          <FileText size={18} />
          <span>Download reports</span>
          <ArrowRight size={15} />
        </Link>
        <Link to="/profile" className="quick-card">
          <Users size={18} />
          <span>Family & account</span>
          <ArrowRight size={15} />
        </Link>
      </section>

      <Link to="/timetable" className="btn btn-tonal hide-desktop login-mobile-cta">
        See the full timetable <ArrowRight size={16} />
      </Link>

      <p className="week-note">
        Week beginning {formatShortDate(data.weekBeginning)} · times shown in your local zone
      </p>
    </div>
  );
}