import { useQuery } from "@tanstack/react-query";
import { Download, FileText, GraduationCap, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import { ErrorState, PageSkeleton, EmptyState } from "../components/States";
import { formatShortDate, relativeDate } from "../lib/format";
import type { Report } from "@shared/types";

function groupReports(reports: Report[]): Array<{ year: string; items: Report[] }> {
  const groups = new Map<string, Report[]>();
  for (const report of reports) {
    const key = report.academicYear || "Other";
    const list = groups.get(key) ?? [];
    list.push(report);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, items]) => ({ year, items }));
}

export function ReportsPage() {
  const query = useQuery({ queryKey: ["reports"], queryFn: () => api.reports() });

  if (query.isPending) return <PageSkeleton />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const groups = groupReports(query.data ?? []);

  if (!groups.length) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Academic records</p>
            <h1>Reports</h1>
          </div>
        </header>
        <EmptyState
          icon={<FileText size={20} />}
          title="No reports yet"
          description="Reports shared by the school will appear here."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Academic records</p>
          <h1>Reports</h1>
        </div>
        <span className="count-chip">
          <FileText size={14} /> {query.data?.length ?? 0}
        </span>
      </header>

      <div className="report-groups">
        {groups.map((group) => (
          <section key={group.year} className="card">
            <header className="card-head">
              <div>
                <h2>{group.year}</h2>
                <p className="card-sub">
                  {group.items.length} document{group.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="stat-icon">
                <GraduationCap size={18} />
              </span>
            </header>

            <ul className="report-list">
              {group.items.map((report) => (
                <li key={report.id} className="report-row">
                  <span className="report-icon">
                    <FileText size={18} />
                  </span>
                  <div className="report-body">
                    <strong>{report.title}</strong>
                    <span>
                      Added {formatShortDate(report.createdDate)} ·{" "}
                      <time dateTime={report.createdDate}>{relativeDate(report.createdDate)}</time>
                    </span>
                  </div>
                  <div className="report-actions">
                    <a
                      className="btn btn-tonal btn-sm"
                      href={api.reportFileUrl(report.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={15} /> Open
                    </a>
                    <a
                      className="btn btn-text btn-sm"
                      href={api.reportFileUrl(report.id)}
                      download={report.fileName || "report.pdf"}
                      aria-label={`Download ${report.title}`}
                    >
                      <Download size={16} /> Save
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}