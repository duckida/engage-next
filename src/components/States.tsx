import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import type { ApiError } from "../lib/api";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`.trim()} style={style} />;
}

export function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <div className="splash-mark">
        <img src="/crest.png" alt="" />
      </div>
    </div>
  );
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="page-enter" aria-hidden="true">
      <Skeleton className="skeleton-eyebrow" />
      <Skeleton className="skeleton-title" />
      <div className="skeleton-grid">
        <Skeleton className="skeleton-block" style={{ height: 320 }} />
        <Skeleton className="skeleton-block" style={{ height: 220 }} />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="skeleton-row" />
      ))}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const message =
    error instanceof Error ? error.message : "Something went wrong while loading this page.";
  const isAuth = (error as ApiError | undefined)?.status === 401;

  return (
    <div className={`state-card ${compact ? "is-compact" : ""}`}>
      <span className="state-icon error">
        <AlertCircle size={22} strokeWidth={1.8} />
      </span>
      <div>
        <h3>{isAuth ? "Your session has ended" : "That didn’t load"}</h3>
        <p>{message}</p>
      </div>
      {onRetry && !isAuth ? (
        <button type="button" className="btn btn-tonal" onClick={onRetry}>
          <RefreshCw size={16} />
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-card empty">
      <span className="state-icon">
        {icon ?? <Inbox size={22} strokeWidth={1.8} />}
      </span>
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
