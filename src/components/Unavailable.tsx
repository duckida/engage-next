import { CloudOff, RefreshCw } from "lucide-react";
import type { ApiError } from "../lib/api";

/**
 * Shown when /api/me cannot be reached at all — typically a static deploy with
 * no backend behind it, or a stopped local server. Without this the app would
 * sit on the splash forever.
 */
export function Unavailable({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error as ApiError | undefined;
  const isMissingApi = apiError?.code === "no_api" || apiError?.code === "offline";

  return (
    <div className="unavailable">
      <div className="unavailable-card">
        <span className="state-icon error">
          <CloudOff size={22} strokeWidth={1.8} />
        </span>
        <h1>{isMissingApi ? "No server connected" : "Can’t reach Engage"}</h1>
        <p>
          {isMissingApi
            ? "This build is the frontend only. Your school’s data is fetched by the local server, which isn’t running here."
            : apiError?.message || "The server did not respond."}
        </p>

        <div className="unavailable-help">
          <p className="unavailable-label">To run it yourself</p>
          <pre>
            <code>npm install{"\n"}npm run dev</code>
          </pre>
          <p className="unavailable-note">
            Then open <strong>http://localhost:5173</strong>. Your password is only ever sent to that
            local server.
          </p>
        </div>

        {onRetry ? (
          <button type="button" className="btn btn-tonal" onClick={onRetry}>
            <RefreshCw size={16} /> Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
