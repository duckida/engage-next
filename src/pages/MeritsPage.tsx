import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingDown, TrendingUp, Search, CalendarRange } from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState } from "../components/States";
import { formatLongDate, relativeDate, termRange } from "../lib/format";

type Filter = "all" | "positive" | "negative";

export function MeritsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const range = useMemo(() => termRange(), []);

  const query = useQuery({
    queryKey: ["points", range.from, range.to],
    queryFn: () => api.points(range),
  });

  if (query.isPending) return <PageSkeleton />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { summary, entries } = query.data;
  const term = search.trim().toLowerCase();

  const visible = entries.filter((entry) => {
    if (filter === "positive" && entry.points < 0) return false;
    if (filter === "negative" && entry.points >= 0) return false;
    if (!term) return true;
    return `${entry.category} ${entry.type} ${entry.notes} ${entry.awardedBy}`.toLowerCase().includes(term);
  });

  const positiveCount = entries.filter((entry) => entry.points > 0).length;
  const negativeCount = entries.filter((entry) => entry.points < 0).length;
  const max = Math.max(1, ...entries.map((entry) => Math.abs(entry.points)));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            <CalendarRange size={13} /> {formatLongDate(summary.from)} – {formatLongDate(summary.to)}
          </p>
          <h1>Merits</h1>
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search merits…"
            aria-label="Search merits"
          />
        </label>
      </header>

      <section className="summary-hero">
        <div className="summary-total">
          <span className="summary-label">Net points this term</span>
          <strong className={summary.total >= 0 ? "is-positive" : "is-negative"}>
            {summary.total >= 0 ? `+${summary.total}` : summary.total}
          </strong>
          <span className="summary-caption">
            {positiveCount} merit{positiveCount === 1 ? "" : "s"} · {negativeCount} demerit
            {negativeCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="summary-bars">
          <div className="bar-row">
            <span className="bar-icon is-positive">
              <TrendingUp size={15} />
            </span>
            <div className="bar-track">
              <span
                className="bar-fill is-positive"
                style={{ width: `${Math.min(100, (summary.positive / Math.max(summary.positive, summary.negative, 1)) * 100)}%` }}
              />
            </div>
            <span className="bar-value">{summary.positive}</span>
          </div>
          <div className="bar-row">
            <span className="bar-icon is-negative">
              <TrendingDown size={15} />
            </span>
            <div className="bar-track">
              <span
                className="bar-fill is-negative"
                style={{ width: `${Math.min(100, (summary.negative / Math.max(summary.positive, summary.negative, 1)) * 100)}%` }}
              />
            </div>
            <span className="bar-value">{summary.negative}</span>
          </div>
        </div>
      </section>

      <div className="filter-row" role="group" aria-label="Filter merits">
        {(
          [
            { id: "all", label: "All" },
            { id: "positive", label: "Merits" },
            { id: "negative", label: "Demerits" },
          ] as Array<{ id: Filter; label: string }>
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            className={`filter-chip ${filter === option.id ? "is-active" : ""}`}
            onClick={() => setFilter(option.id)}
            aria-pressed={filter === option.id}
          >
            {option.label}
          </button>
        ))}
        <span className="filter-count">{visible.length} shown</span>
      </div>

      {visible.length ? (
        <ul className="ledger">
          {visible.map((entry) => (
            <li key={entry.id} className="ledger-row">
              <span className={`point-badge ${entry.points >= 0 ? "is-positive" : "is-negative"}`}>
                {entry.points >= 0 ? `+${entry.points}` : entry.points}
              </span>
              <div className="ledger-body">
                <div className="ledger-top">
                  <strong>{entry.category || entry.type}</strong>
                  <time dateTime={entry.date} title={formatLongDate(entry.date)}>
                    {relativeDate(entry.date)}
                  </time>
                </div>
                {entry.notes ? <p>{entry.notes}</p> : null}
                <span className="ledger-meta">
                  <Sparkles size={12} /> {entry.awardedBy || entry.type}
                </span>
              </div>
              <div className="ledger-meter" aria-hidden="true">
                <span
                  className={entry.points >= 0 ? "is-positive" : "is-negative"}
                  style={{ width: `${(Math.abs(entry.points) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Sparkles size={20} />}
          title={term ? "No matches" : "Nothing here yet"}
          description={
            term
              ? `No merits match “${search.trim()}”.`
              : "Awards from this term will show up here."
          }
        />
      )}
    </div>
  );
}