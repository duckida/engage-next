import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Search, CalendarRange } from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState } from "../components/States";
import { formatLongDate, relativeDate, termRange, todayIso } from "../lib/format";

type Filter = "all" | "positive" | "negative";
type RangeKey = "term" | "year" | "all";

const rangeOptions: Array<{ id: RangeKey; label: string }> = [
  { id: "term", label: "This term" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];

export function MeritsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [rangeKey, setRangeKey] = useState<RangeKey>("term");

  const range = useMemo<{ from: string; to: string } | undefined>(() => {
    if (rangeKey === "all") return undefined;
    if (rangeKey === "year") {
      return { from: `${new Date().getFullYear()}-01-01`, to: todayIso() };
    }
    return termRange();
  }, [rangeKey]);

  const query = useQuery({
    queryKey: ["points", range?.from ?? "all", range?.to ?? "all"],
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

  // Some portal responses leave the summary dates blank; fall back to the entries.
  const entryDates = entries.map((entry) => entry.date).filter(Boolean).sort();
  const rangeFrom = summary.from || entryDates[0] || "";
  const rangeTo = summary.to || entryDates[entryDates.length - 1] || "";
  const rangeLabel =
    rangeFrom && rangeTo
      ? `${formatLongDate(rangeFrom)} – ${formatLongDate(rangeTo)}`
      : "All time";

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            <CalendarRange size={13} /> {rangeLabel}
          </p>
          <h1>Merits</h1>
        </div>
        <div className="merits-head-actions">
          <label className="range-field">
            <CalendarRange size={16} />
            <select
              value={rangeKey}
              onChange={(event) => setRangeKey(event.target.value as RangeKey)}
              aria-label="Time range"
            >
              {rangeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search merits…"
              aria-label="Search merits"
            />
          </label>
        </div>
      </header>

      <section className="summary-hero">
        <div className="summary-total">
          <span className="summary-label">Net points</span>
          <strong className={summary.total >= 0 ? "is-positive" : "is-negative"}>
            {summary.total >= 0 ? `+${summary.total}` : summary.total}
          </strong>
          <span className="summary-caption">
            {positiveCount} merit{positiveCount === 1 ? "" : "s"} · {negativeCount} demerit
            {negativeCount === 1 ? "" : "s"}
          </span>
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
              : "Awards in this time range will show up here."
          }
        />
      )}
    </div>
  );
}
