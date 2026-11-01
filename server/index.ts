import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Backend } from "./backend.ts";
import { AuthError, EngageClient, EngageError, SessionExpiredError } from "./engage.ts";
import { computeDashboard, londonParts, mondayOf } from "./dashboard.ts";
import { DEMO_NOW, DemoBackend } from "./demo.ts";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const demoMode = process.env.ENGAGE_DEMO === "1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type CacheEntry = { expires: number; value: Promise<unknown> };
type Session = {
  id: string;
  backend: Backend;
  demo: boolean;
  school: string | null;
  createdAt: number;
  lastUsed: number;
  cache: Map<string, CacheEntry>;
};

type AuthedRequest = Request & { session?: Session };

const sessions = new Map<string, Session>();
const demoSession: Session = {
  id: "demo",
  backend: new DemoBackend(),
  demo: true,
  school: null,
  createdAt: Date.now(),
  lastUsed: Date.now(),
  cache: new Map(),
};

function newSession(backend: Backend, demo = false): Session {
  return {
    id: crypto.randomUUID(),
    backend,
    demo,
    school: null,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    cache: new Map(),
  };
}

function sessionFor(req: AuthedRequest): Session | undefined {
  const sid = req.cookies?.en_sid;
  if (typeof sid === "string") {
    const session = sessions.get(sid);
    if (session) {
      session.lastUsed = Date.now();
      return session;
    }
  }
  return demoMode ? demoSession : undefined;
}

function cached<T>(session: Session, key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = session.cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;

  const value = load().catch((error) => {
    if (session.cache.get(key)?.value === value) session.cache.delete(key);
    throw error;
  });
  session.cache.set(key, { expires: Date.now() + ttl, value });
  return value;
}

async function withRetry<T>(session: Session, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof SessionExpiredError && !session.demo && session.backend.reauthenticate) {
      await session.backend.reauthenticate();
      return await run();
    }
    throw error;
  }
}

const asyncHandler =
  (handler: (req: AuthedRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req as AuthedRequest, res).catch(next);
  };

/**
 * Turn whatever the user typed into a bare Engage sub-domain slug.
 * Accepts "stmarks", "st-marks", "stmarks.engagehosted.com" or a full URL.
 */
function normaliseSchool(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const withoutScheme = raw.replace(/^https?:\/\//, "");
  const host = withoutScheme.split("/")[0];
  const slug = host.replace(/\.engagehosted\.com$/, "");

  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) return null;
  if (slug.includes("--")) return null;
  return slug;
}

function dateParam(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, demo: demoMode });
});

app.post(
  "/api/login",
  asyncHandler(async (req, res) => {
    const body = req.body as { school?: unknown; username?: unknown; password?: unknown };
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const school = normaliseSchool(typeof body?.school === "string" ? body.school : "");

    if (!school) {
      res.status(400).json({
        error: { code: "bad_request", message: "Enter your school's Engage address." },
      });
      return;
    }
    if (!username || !password) {
      res.status(400).json({ error: { code: "bad_request", message: "Enter your Engage username and password." } });
      return;
    }
    if (username.length > 120 || password.length > 200) {
      res.status(400).json({ error: { code: "bad_request", message: "That login looks too long." } });
      return;
    }

    if (demoMode) {
      res.json({ user: demoSession.backend.getUser(), demo: true, school: null });
      return;
    }

    const client = new EngageClient(school);
    const user = await client.login(username, password);
    const session = newSession(client);
    session.school = school;
    sessions.set(session.id, session);

    res.cookie("en_sid", session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ user, demo: false, school });
  }),
);

app.post("/api/logout", (req, res) => {
  const sid = req.cookies?.en_sid;
  if (typeof sid === "string") sessions.delete(sid);
  res.clearCookie("en_sid", { path: "/" });
  res.json({ ok: true });
});

// /api/me is the session probe: it answers 200 with `user: null` when logged
// out, so the client can render the login screen without a 401 round-trip.
app.get("/api/me", (req, res) => {
  const session = sessionFor(req as AuthedRequest);
  if (!session) {
    res.json({ user: null, demo: demoMode, school: null });
    return;
  }
  res.json({ user: session.backend.getUser(), demo: session.demo, school: session.school });
});

app.use("/api", (req, res, next) => {
  const session = sessionFor(req as AuthedRequest);
  if (!session) {
    res.status(401).json({ error: { code: "no_session", message: "Please sign in to continue." } });
    return;
  }
  (req as AuthedRequest).session = session;
  next();
});

app.get(
  "/api/dashboard",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const now = session.demo ? DEMO_NOW : new Date();
    const data = await withRetry(session, () =>
      cached(session, "dashboard", 30_000, () => computeDashboard(session.backend, now)),
    );
    res.json(data);
  }),
);

app.get(
  "/api/timetable",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const requested = dateParam(req.query.week);
    const base = session.demo ? DEMO_NOW : new Date();
    const week = requested ? mondayOf(requested) : mondayOf(londonParts(base).date);

    const data = await withRetry(session, () =>
      cached(session, `timetable:${week}`, 5 * 60_000, () => session.backend.getTimetable(week)),
    );
    res.json(data);
  }),
);

app.get(
  "/api/points",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const from = dateParam(req.query.from);
    const to = dateParam(req.query.to);
    if ((from && !to) || (to && !from)) {
      res.status(400).json({ error: { code: "bad_request", message: "Provide both dates, or neither." } });
      return;
    }

    const data = await withRetry(session, () =>
      cached(session, `points:${from ?? "all"}:${to ?? "all"}`, 60_000, () =>
        session.backend.getPoints(from, to),
      ),
    );
    res.json(data);
  }),
);

app.get(
  "/api/reports",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const data = await withRetry(session, () =>
      cached(session, "reports", 5 * 60_000, () => session.backend.getReports()),
    );
    res.json(data);
  }),
);

app.get(
  "/api/reports/:id/file",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const reports = await withRetry(session, () =>
      cached(session, "reports", 5 * 60_000, () => session.backend.getReports()),
    );
    const report = reports.find((item) => item.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: { code: "not_found", message: "That report could not be found." } });
      return;
    }

    const file = await withRetry(session, () => session.backend.getReportFile(report));
    res.setHeader("Content-Type", file.contentType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${slug(report.title) || "report"}.pdf"`);
    res.send(file.buffer);
  }),
);

app.get(
  "/api/notices",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const data = await withRetry(session, () =>
      cached(session, "notices", 60_000, () => session.backend.getNotices()),
    );
    res.json(data);
  }),
);

app.get(
  "/api/notices/:id",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = String(req.params.id);
    if (!/^[a-z0-9-]{1,40}$/i.test(id)) {
      res.status(400).json({ error: { code: "bad_request", message: "Invalid notice id." } });
      return;
    }
    const data = await withRetry(session, () =>
      cached(session, `notice:${id}`, 10 * 60_000, () => session.backend.getNotice(id)),
    );
    res.json(data);
  }),
);

app.get(
  "/api/siblings",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const data = await withRetry(session, () =>
      cached(session, "siblings", 10 * 60_000, () => session.backend.getSiblings()),
    );
    res.json(data);
  }),
);

app.get(
  "/api/photo",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const raw = typeof req.query.pid === "string" ? req.query.pid : "";
    let pid = raw;
    try {
      pid = decodeURIComponent(raw);
    } catch {
      pid = raw;
    }
    if (!pid || pid.length > 200 || !/^[A-Za-z0-9+/=%._-]+$/.test(pid)) {
      res.status(400).json({ error: { code: "bad_request", message: "Invalid photo id." } });
      return;
    }

    const photo = await withRetry(session, () => session.backend.getPhoto(pid));
    res.setHeader("Content-Type", photo.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(photo.buffer);
  }),
);

app.use((req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Unknown API route." } });
});

const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AuthError) {
    res.status(401).json({ error: { code: "auth_failed", message: error.message } });
    return;
  }
  if (error instanceof SessionExpiredError) {
    res.status(401).json({
      error: { code: "session_expired", message: "Your school session expired. Please sign in again." },
    });
    return;
  }
  if (error instanceof EngageError) {
    res.status(502).json({ error: { code: "engage_error", message: error.message } });
    return;
  }

  // A bad school address surfaces as a DNS failure from fetch().
  const cause = (error as { cause?: { code?: string } })?.cause;
  const dnsCode = cause?.code ?? (error as { code?: string })?.code;
  if (dnsCode === "ENOTFOUND" || dnsCode === "EAI_AGAIN" || dnsCode === "ECONNREFUSED" || dnsCode === "ETIMEDOUT") {
    res.status(404).json({
      error: {
        code: "school_not_found",
        message: "No Engage portal found at that address. Check your school's address and try again.",
      },
    });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: { code: "bad_request", message: "Invalid request body." } });
    return;
  }

  console.error("[engage-next]", error);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong in the local server." } });
});

const cleanup = setInterval(
  () => {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    for (const [id, session] of sessions) {
      if (session.lastUsed < cutoff) sessions.delete(id);
    }
  },
  10 * 60 * 1000,
);
cleanup.unref?.();

app.listen(port, host, () => {
  console.log(
    `engage-next api listening on http://${host}:${port}${demoMode ? " (demo mode)" : ""}`,
  );
});
