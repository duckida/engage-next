import type {
  DashboardPayload,
  MePayload,
  Notice,
  NoticeDetail,
  PointsPayload,
  Report,
  Sibling,
  Timetable,
} from "@shared/types";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = { authEvent?: boolean };

function emitUnauthorized() {
  window.dispatchEvent(new CustomEvent("engage:unauthorized"));
}

async function request<T>(path: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...init,
      headers,
    });
  } catch {
    // fetch() only rejects on a transport failure: no server, no network.
    throw new ApiError(
      "offline",
      "Can’t reach the local server. Start it with npm run dev and try again.",
      0,
    );
  }

  if (!response.ok) {
    let code = "unknown";
    let message = "Something went wrong. Please try again.";
    try {
      const payload = (await response.json()) as { error?: { code?: string; message?: string } };
      if (payload?.error?.code) code = payload.error.code;
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      /* keep the generic message */
    }

    // A static host answers /api/* with its SPA fallback (HTML, 200) or a 404.
    // Either way there is no API behind this build.
    if (code === "unknown" && (response.status === 404 || response.status === 200)) {
      throw new ApiError(
        "no_api",
        "This build is the frontend only — no server is answering /api.",
        404,
      );
    }

    if (response.status === 401 && options.authEvent !== false) emitUnauthorized();
    throw new ApiError(code, message, response.status);
  }

  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    // HTML where JSON was expected: again, a static fallback, not our API.
    throw new ApiError(
      "no_api",
      "This build is the frontend only — no server is answering /api.",
      404,
    );
  }
}

export const api = {
  // No auth event here: a 401 from /me is how we learn we're logged out.
  me: () => request<MePayload>("/me", {}, { authEvent: false }),
  login: (school: string, username: string, password: string) =>
    request<MePayload>(
      "/login",
      { method: "POST", body: JSON.stringify({ school, username, password }) },
      { authEvent: false },
    ),
  logout: () => request<{ ok: boolean }>("/logout", { method: "POST" }),
  dashboard: () => request<DashboardPayload>("/dashboard"),
  timetable: (week?: string) =>
    request<Timetable>(`/timetable${week ? `?week=${encodeURIComponent(week)}` : ""}`),
  points: (range?: { from: string; to: string }) =>
    request<PointsPayload>(
      `/points${range ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}` : ""}`,
    ),
  reports: () => request<Report[]>("/reports"),
  reportFileUrl: (id: string) => `/api/reports/${encodeURIComponent(id)}/file`,
  notices: () => request<Notice[]>("/notices"),
  notice: (id: string) => request<NoticeDetail>(`/notices/${encodeURIComponent(id)}`),
  siblings: () => request<Sibling[]>("/siblings"),
};
