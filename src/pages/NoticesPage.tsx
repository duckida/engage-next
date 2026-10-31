import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, ArrowLeft, Send, X } from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState, Skeleton } from "../components/States";
import { relativeDate, formatLongDate } from "../lib/format";
import { Avatar } from "../components/Avatar";
import { surnameFirst } from "../lib/format";

export function NoticesPage() {
  const listQuery = useQuery({ queryKey: ["notices"], queryFn: () => api.notices() });
  const [openId, setOpenId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["notice", openId],
    queryFn: () => api.notice(openId as string),
    enabled: openId !== null,
  });

  useEffect(() => {
    if (!openId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  if (listQuery.isPending) return <PageSkeleton />;
  if (listQuery.error)
    return <ErrorState error={listQuery.error} onRetry={() => void listQuery.refetch()} />;

  const notices = listQuery.data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">From the school</p>
          <h1>Notices</h1>
        </div>
        <span className="count-chip">
          <Bell size={14} /> {notices.length}
        </span>
      </header>

      {notices.length ? (
        <ul className="notice-list">
          {notices.map((notice, index) => (
            <li key={notice.id}>
              <button
                type="button"
                className={`notice-row ${index === 0 ? "is-latest" : ""}`}
                onClick={() => setOpenId(notice.id)}
              >
                <Avatar name={surnameFirst(notice.sender) || notice.title} src={notice.photoUrl} size={44} />
                <span className="notice-body">
                  <span className="notice-top">
                    <strong>{notice.title}</strong>
                    <time dateTime={notice.date} title={formatLongDate(notice.date)}>
                      {relativeDate(notice.date)}
                    </time>
                  </span>
                  <span className="notice-sender">
                    <Send size={12} /> {surnameFirst(notice.sender) || "School office"}
                  </span>
                </span>
                <span className="notice-cta">Read</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell size={20} />}
          title="No notices"
          description="School announcements will land here."
        />
      )}

      <div className={`sheet ${openId ? "is-open" : ""}`} aria-hidden={!openId}>
        <button
          type="button"
          className="sheet-scrim"
          aria-label="Close notice"
          onClick={() => setOpenId(null)}
          tabIndex={openId ? 0 : -1}
        />
        <article className="sheet-panel" role="dialog" aria-modal="true" aria-label="Notice">
          <header className="sheet-head">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setOpenId(null)}
              aria-label="Back to notices"
            >
              <ArrowLeft size={18} />
            </button>
            <span>Notice</span>
            <button type="button" className="icon-btn" onClick={() => setOpenId(null)} aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <div className="sheet-content">
            {detailQuery.isPending ? (
              <>
                <Skeleton className="skeleton-title" />
                <Skeleton className="skeleton-row" style={{ height: 120 }} />
              </>
            ) : detailQuery.error ? (
              <ErrorState error={detailQuery.error} compact onRetry={() => void detailQuery.refetch()} />
            ) : detailQuery.data ? (
              <>
                <p className="eyebrow">
                  {detailQuery.data.sender} · {formatLongDate(detailQuery.data.date.slice(0, 10))}
                </p>
                <h2>{detailQuery.data.subject}</h2>
                <time className="sheet-date" dateTime={detailQuery.data.date}>
                  {formatLongDate(detailQuery.data.date.slice(0, 10))}
                </time>
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: detailQuery.data.bodyHtml }}
                />
              </>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}