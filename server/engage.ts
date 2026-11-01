import { CookieJar } from "tough-cookie";
import * as cheerio from "cheerio";
import type {
  Notice,
  NoticeDetail,
  PointEntry,
  PointsPayload,
  Report,
  SessionUser,
  Sibling,
  Timetable,
  TimetableDay,
  TimetableLesson,
} from "../shared/types.ts";

/**
 * Build the Engage host for a school slug, e.g. "stmarks" ->
 * https://stmarks.engagehosted.com. The school is chosen at sign-in time;
 * nothing is hard-coded to one institution.
 */
export function schoolBaseUrl(school: string): string {
  return `https://${school}.engagehosted.com`;
}

export class AuthError extends Error {
  code = "auth_failed";
}

export class SessionExpiredError extends Error {
  code = "session_expired";
}

export class EngageError extends Error {
  code = "engage_error";
}

type HttpResult = {
  status: number;
  url: string;
  text: string;
  headers: Headers;
};

type HttpOptions = {
  method?: string;
  form?: Record<string, string>;
  json?: unknown;
  headers?: Record<string, string>;
  referer?: string;
};

function formBody(fields: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.append(k, v);
  return params.toString();
}

function parseFormFields(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  $("form#aspnetForm input[name], form[name='aspnetForm'] input[name]").each((_, el) => {
    const name = $(el).attr("name");
    if (!name) return;
    const type = ($(el).attr("type") || "text").toLowerCase();
    if (type === "checkbox" || type === "radio") {
      if ($(el).is("[checked]")) fields[name] = $(el).attr("value") ?? "on";
      return;
    }
    if (type === "submit" || type === "button" || type === "image" || type === "file") return;
    if (type === "password") return;
    fields[name] = $(el).attr("value") ?? "";
  });
  return fields;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** First form field name matching a predicate. */
function findField(
  fields: Record<string, string>,
  predicate: (name: string) => boolean,
): string | undefined {
  return Object.keys(fields).find(predicate);
}

/**
 * Hard ceiling on any single portal request. Vercel kills the function at
 * maxDuration; without this the browser waits on a promise that never settles,
 * leaving the UI on skeletons forever.
 */
const PORTAL_TIMEOUT_MS = 12_000;

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * Parse the portal's various date spellings:
 *   "02/11/2026", "2.11.2026", "02 November 2026", "2 Nov 2026", "2026-11-02".
 */
function isoFromDmy(value: string): string | null {
  const text = value.trim();

  const numeric = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (numeric) {
    return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return text;

  // "02 November 2026" / "2 Nov 2026"
  const named = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const monthName = named[2].toLowerCase();
    const month = MONTHS.findIndex((m) => m === monthName || m.startsWith(monthName.slice(0, 3)));
    if (month >= 0) {
      return `${named[3]}-${String(month + 1).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
    }
  }

  return null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateToDmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function clean(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function textLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .split("\n")
    .map((l) => clean(l))
    .filter(Boolean);
}

function proxiedPhoto(src: string | undefined): string | null {
  if (!src) return null;
  const pid = src.match(/pid=([^&"']+)/)?.[1];
  return pid ? `/api/photo?pid=${encodeURIComponent(pid)}` : null;
}

function parseLessonCell(cell: cheerio.Cheerio<any>, day: string, index: number): TimetableLesson | null {
  const $ = cheerio;
  const lessonText = cell.find(".ttLessonText");

  if (!lessonText.length) {
    const cls = cell.attr("class") ?? "";
    const raw = textLines(cell.html() ?? "");

    // Holiday weeks collapse to one wide cell carrying the closure note, e.g.
    // "Autumn Half Term" or "School closed", usually without a time range.
    const text = clean(raw.join(" "));
    if (text && /half\s*term|holiday|school closed|inset|bank holiday|closure/i.test(text)) {
      return {
        id: `${day}-${index}-holiday`,
        kind: "event",
        period: null,
        subject: text,
        start: "",
        end: "",
        room: null,
        teachers: [],
        image: null,
        color: null,
      };
    }

    if (cls.includes("break")) {
      const start = raw[0] ?? "";
      const end = raw[1] ?? "";
      return {
        id: `${day}-${index}-break`,
        kind: "break",
        period: null,
        subject: "Break",
        start,
        end,
        room: null,
        teachers: [],
        image: null,
        color: null,
      };
    }
    return null;
  }

  const lines = textLines(lessonText.html() ?? "");

  if (!lines.length) return null;

  const timeIndex = lines.findIndex((l) => /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(l));
  const time = timeIndex >= 0 ? lines[timeIndex] : "";
  const [start = "", end = ""] = time.split(" - ").map((s) => s.trim());

  const before = lines.slice(0, timeIndex >= 0 ? timeIndex : lines.length);
  const after = timeIndex >= 0 ? lines.slice(timeIndex + 1) : [];

  let period: string | null = null;
  if (before[0] && /^Lesson\s+\d+/i.test(before[0])) {
    period = before[0].replace(/^Lesson\s+/i, "");
    before.shift();
  }

  const subject = before.join(" ") || lines[0];
  const room = after[0] ?? null;
  const teachers = after
    .slice(1)
    .join(" & ")
    .split(/\s*&\s*/)
    .map((t) => clean(t))
    .filter(Boolean);

  const isBreak = /half term|break|holiday|inset/i.test(subject);

  return {
    id: `${day}-${index}-${period ?? subject}`.replace(/\s+/g, "-").toLowerCase(),
    kind: isBreak ? "event" : "lesson",
    period,
    subject,
    start,
    end,
    room,
    teachers,
    image: cell.find("img").attr("src") ?? null,
    color: cell.find(".relative").attr("style")?.match(/color:\s*(#[0-9a-f]{3,8})/i)?.[1] ?? null,
  };
}

export function parseTimetable(html: string): Timetable {
  const $ = cheerio.load(html);
  const label = clean($("[id$='lblWeek']").first().text());
  const labelIso = isoFromDmy(label.replace(/^Week Beginning\s*/i, ""));
  const table = $("table[id^='tblTimeTable']").first();

  if (!table.length) throw new EngageError("Timetable was not present in the page.");

  const weekBeginning = labelIso ?? new Date().toISOString().slice(0, 10);
  const days: TimetableDay[] = [];
  let sawDayRow = false;

  table.find("tr").each((rowIndex, row) => {
    if (rowIndex === 0) return;
    // Day names may sit in a <th> or a <td> depending on the portal's skin.
    const cells = $(row).children("td, th");
    if (cells.length < 2) return;

    const day = matchDay(clean(cells.first().text()));
    if (!day) return;
    sawDayRow = true;

    const lessons: TimetableLesson[] = [];
    cells.slice(1).each((cellIndex, cell) => {
      const parsed = parseLessonCell($(cell), day, cellIndex);
      if (parsed) lessons.push(parsed);
    });

    const date = addDays(weekBeginning, DAYS.indexOf(day));
    const note = lessons.length === 1 && lessons[0].kind === "event" ? lessons[0].subject : null;

    days.push({ date, day, lessons, note });
  });

  if (!days.length) {
    // Fail loudly rather than returning an empty week the UI cannot explain.
    console.error("[engage-next] timetable parse failed", {
      label,
      labelIso,
      tableFound: table.length > 0,
      sawDayRow,
      rowCount: table.find("tr").length,
      firstRowCells: table.find("tr").eq(1).children("td, th").length,
      firstCellText: clean(table.find("tr").eq(1).children("td, th").first().text()).slice(0, 40),
      hasLessonText: table.find(".ttLessonText").length,
      bodySnippet: clean($("body").text()).slice(0, 300),
    });
    throw new EngageError(
      sawDayRow
        ? "The timetable page loaded but no lessons could be read from it."
        : "Could not read the timetable layout. The portal may have changed.",
    );
  }
  return { weekBeginning, days };
}

/** "Monday", "Monday 3 November", "MONDAY" -> canonical day name. */
function matchDay(text: string): string | null {
  const lower = text.toLowerCase();
  for (const day of DAYS) {
    if (lower === day.toLowerCase()) return day;
    if (new RegExp(`^${day}\\b`, "i").test(text)) return day;
    if (new RegExp(`\\b${day}\\b`, "i").test(text)) return day;
  }
  return null;
}

function parsePoints(json: any): PointsPayload {
  const entries: PointEntry[] = (json.points ?? [])
    .filter((p: any) => p.canSee !== false)
    .map((p: any) => {
      const rawType = String(p.pointsType ?? "");
      const [category, ...rest] = rawType.split(" / ");
      return {
        id: Number(p.pointsID),
        date: String(p.pointsDate ?? "").slice(0, 10),
        awardedBy: String(p.awardedBy ?? ""),
        type: rest.join(" / ") || rawType,
        category: rest.length ? category : "Behaviour",
        notes: String(p.notes ?? "").trim(),
        points: Number(p.pointsTotal ?? 0),
      };
    });

  return {
    summary: {
      positive: Number(json.filteredPositivePoints ?? json.totalPositivePoints ?? 0),
      negative: Number(json.filteredNegativePoints ?? json.totalNegativePoints ?? 0),
      total:
        Number(json.filteredPositivePoints ?? json.totalPositivePoints ?? 0) +
        Number(json.filteredNegativePoints ?? json.totalNegativePoints ?? 0),
      from: String(json.dateFrom ?? "").slice(0, 10),
      to: String(json.dateTo ?? "").slice(0, 10),
    },
    entries,
  };
}

export type SerializedCookie = {
  k: string;
  v: string;
  d?: string;
  p?: string;
  e?: number;
  s?: boolean;
  h?: boolean;
};

/** Portable session snapshot, encrypted into the browser cookie. */
export type SerializedSession = {
  v: 1;
  school: string;
  cookies: SerializedCookie[];
  pupilId?: string | null;
  user?: SessionUser | null;
};

export class EngageClient {
  private jar = new CookieJar();
  private formPage: string | null = null;
  private pupilId: string | null = null;
  private credentials?: { username: string; password: string };
  user: SessionUser | null = null;
  readonly base: string;

  constructor(school: string, credentials?: { username: string; password: string }) {
    this.base = schoolBaseUrl(school);
    this.credentials = credentials;
  }

  getUser(): SessionUser {
    if (!this.user) throw new EngageError("Not signed in.");
    return this.user;
  }

  private storeCookies(res: Response, url: string) {
    const cookies =
      typeof (res.headers as any).getSetCookie === "function"
        ? (res.headers as any).getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie")]
          : [];
    for (const cookie of cookies) {
      if (!cookie) continue;
      try {
        this.jar.setCookieSync(cookie, url, { ignoreError: true });
      } catch {
        /* ignore malformed cookie */
      }
    }
  }

  private async rawRequest(url: string, init: RequestInit, depth = 0): Promise<HttpResult> {
    if (depth > 8) throw new EngageError("Too many redirects from the portal.");

    const headers = new Headers(init.headers);
    const cookie = this.jar.getCookieStringSync(url);
    if (cookie) headers.set("cookie", cookie);
    if (!headers.has("user-agent")) {
      headers.set(
        "user-agent",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      );
    }
    if (!headers.has("accept")) headers.set("accept", "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8");
    if (!headers.has("accept-language")) headers.set("accept-language", "en-GB,en;q=0.9");

    const res = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
      // A hung portal must not hang the request forever.
      signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
    });
    this.storeCookies(res, url);

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url).href;
      const method = (init.method ?? "GET").toUpperCase();
      const switchToGet = res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST");
      return this.rawRequest(
        next,
        switchToGet ? { method: "GET", headers: init.headers } : init,
        depth + 1,
      );
    }

    const text = await res.text();
    return { status: res.status, url: res.url || url, text, headers: res.headers };
  }

  async request(path: string, options: HttpOptions = {}): Promise<HttpResult> {
    const url = path.startsWith("http") ? path : `${this.base}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.referer) headers.referer = options.referer;

    let body: BodyInit | undefined;
    if (options.json !== undefined) {
      headers["content-type"] = "application/json; charset=utf-8";
      headers["x-requested-with"] = "XMLHttpRequest";
      body = JSON.stringify(options.json);
    } else if (options.form) {
      headers["content-type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      body = formBody(options.form);
    }

    return this.rawRequest(url, { method: options.method ?? "GET", headers, body });
  }

  private looksLikeLogin(text: string, url: string) {
    return (
      url.includes("Login.aspx") ||
      text.includes("ctl00$PageContent$loginControl$txtUN") ||
      text.includes("loginControl_txtUN")
    );
  }

  async login(username: string, password: string): Promise<SessionUser> {
    this.credentials = { username, password };

    const first = await this.request("/Login.aspx?ReturnUrl=%2f");
    const fields = parseFormFields(first.text);
    if (!fields["__VIEWSTATE"]) throw new EngageError("Could not read the portal login form.");

    fields["ctl00$PageContent$loginControl$txtUN"] = username;
    fields["ctl00$PageContent$loginControl$txtPwd"] = password;
    fields["ctl00$PageContent$loginControl$btnLogin"] = "Login";
    fields["ctl00$PageContent$loginControl$cbRememberMe"] = "on";
    fields["__EVENTTARGET"] = "";
    fields["__EVENTARGUMENT"] = "";
    fields["__LASTFOCUS"] = "";

    const result = await this.request("/Login.aspx?ReturnUrl=%2f", {
      method: "POST",
      form: fields,
      referer: `${this.base}/Login.aspx?ReturnUrl=%2f`,
    });

    const loggedOut = this.looksLikeLogin(result.text, result.url);
    if (loggedOut) {
      const $ = cheerio.load(result.text);
      const message = clean(
        $(".loginFeedback").text() ||
          $(".alert-danger, .alert-error, .validation-summary-errors").first().text() ||
          "The school portal rejected that username or password.",
      );
      throw new AuthError(message);
    }

    const home = await this.request("/vle/");
    if (this.looksLikeLogin(home.text, home.url)) throw new AuthError("Login did not create a session.");

    this.user = this.parseUser(home.text);
    return this.user;
  }

  private parseUser(html: string): SessionUser {
    const $ = cheerio.load(html);
    const name = clean($("#ctl00_lblUserName").text()) || "Pupil";
    const firstName = name.split(/\s+/)[0] || "Pupil";
    const photo = $("img[src*='DBImage.axd?type=pupil']").first().attr("src") ?? null;
    const pid = photo?.match(/pid=([^&"']+)/)?.[1] ?? null;
    if (pid) this.pupilId = pid;
    return { name, firstName, photoUrl: pid ? `/api/photo?pid=${encodeURIComponent(pid)}` : null };
  }

  async ensureSession(): Promise<void> {
    if (!this.credentials) throw new SessionExpiredError("No session.");
    const probe = await this.request("/vle/");
    if (this.looksLikeLogin(probe.text, probe.url)) {
      await this.login(this.credentials.username, this.credentials.password);
    } else if (!this.user) {
      this.user = this.parseUser(probe.text);
    }
  }

  async getPage(path: string): Promise<HttpResult> {
    const res = await this.request(path);
    if (this.looksLikeLogin(res.text, res.url)) throw new SessionExpiredError("Session expired.");
    return res;
  }

  async getPupilId(): Promise<string> {
    if (this.pupilId) return this.pupilId;
    const res = await this.getPage("/VLE/pupildetails.aspx?detail=Points");
    const id = cheerio.load(res.text)("input[id$='hdnPupilID']").first().attr("value");
    if (!id) throw new EngageError("Could not identify the pupil record.");
    this.pupilId = id;
    return id;
  }

  private async asmx(service: string, method: string, body: unknown): Promise<any> {
    const res = await this.request(`/Services/${service}.asmx/${method}`, { method: "POST", json: body });
    if (this.looksLikeLogin(res.text, res.url)) throw new SessionExpiredError("Session expired.");
    if (res.status >= 400) {
      let message = "The portal could not complete that request.";
      try {
        const parsed = JSON.parse(res.text);
        if (parsed?.Message && !/error processing/i.test(parsed.Message)) message = parsed.Message;
      } catch {
        /* ignore */
      }
      throw new EngageError(message);
    }
    let json: any;
    try {
      json = JSON.parse(res.text);
    } catch {
      throw new EngageError("Unexpected response from the portal.");
    }
    const d = json?.d;
    if (typeof d === "string") {
      try {
        return JSON.parse(d);
      } catch {
        return d;
      }
    }
    return d;
  }

  async getPoints(from?: string, to?: string): Promise<PointsPayload> {
    const id = await this.getPupilId();
    if (from && to) {
      const data = await this.asmx("PupilDetailsServices", "GetPupilPointsDataByDate", {
        encryptedPupilId: id,
        dateFrom: `${from}T00:00:00`,
        dateTo: `${to}T23:59:59`,
      });
      return parsePoints(data);
    }
    const data = await this.asmx("PupilDetailsServices", "GetPupilPointsData", { encryptedPupilId: id });
    return parsePoints(data);
  }

  async getTimetable(week?: string): Promise<Timetable> {
    const path = "/VLE/WeeklyTimetable.aspx";
    const page = await this.getPage(path);
    if (!week) return parseTimetable(page.text);

    const monday = week.slice(0, 10);
    const fields = parseFormFields(page.text);
    const saturday = addDays(monday, 5);
    const text = dateToDmy(saturday);
    const isoState = `${saturday}-00-00-00`;

    // Discover the week-picker fields rather than assuming their control IDs;
    // ASP.NET names change when the portal is updated.
    const inputName =
      findField(fields, (n) => /dpWeekSelectorStartDate.*dateInput$/i.test(n) && !/ClientState/i.test(n)) ??
      findField(fields, (n) => /dtPicker.*dateInput$/i.test(n) && !/ClientState/i.test(n));
    const stateName =
      findField(fields, (n) => /dpWeekSelectorStartDate.*dateInput_ClientState$/i.test(n)) ??
      findField(fields, (n) => /dtPicker.*dateInput_ClientState$/i.test(n));

    if (!inputName) {
      // No picker on this page: fall back to whatever week the portal returned.
      return parseTimetable(page.text);
    }

    fields[inputName] = text;
    if (stateName) {
      try {
        const state = JSON.parse(fields[stateName] ?? "{}");
        fields[stateName] = JSON.stringify({
          ...state,
          validationText: isoState,
          valueAsString: isoState,
          lastSetTextBoxValue: text,
        });
      } catch {
        /* leave state untouched */
      }
    }
    fields["__EVENTTARGET"] = inputName;
    fields["__EVENTARGUMENT"] = "";
    fields["__LASTFOCUS"] = "";

    const res = await this.request(path, { method: "POST", form: fields, referer: `${this.base}${path}` });
    if (this.looksLikeLogin(res.text, res.url)) throw new SessionExpiredError("Session expired.");
    return parseTimetable(res.text);
  }

  async getReports(): Promise<Report[]> {
    const id = await this.getPupilId();
    const data = await this.asmx("PupilDetailsServices", "GetPupilAssessmentReports", {
      encryptedPupilID: id,
      reportingPeriod: "",
      academicYear: 0,
      showAllReports: true,
    });
    if (!Array.isArray(data)) return [];
    return data.map((r: any) => ({
      id: String(r.FileID ?? r.Uri ?? Math.random()),
      title: clean(String(r.Title ?? "Report")).replace(/\s+For\s+.*$/i, "") || "Report",
      academicYear: String(r.AcademicYearText ?? ""),
      createdDate: String(r.CreatedDate ?? "").slice(0, 10),
      url: String(r.Uri ?? ""),
      fileName: String(r.FileName ?? "report.pdf"),
    }));
  }

  async getSiblings(): Promise<Sibling[]> {
    const id = await this.getPupilId();
    const html: string = await this.asmx("PupilDetailsServices", "RenderSimpleSection", {
      encryptedPupilID: id,
      sectionType: "Siblings",
    });
    if (typeof html !== "string" || !html.trim()) return [];

    const $ = cheerio.load(html);
    const siblings: Sibling[] = [];
    $(".js-PupilDetailSectionContent .row-fluid").each((_, el) => {
      const card = $(el);
      const name = clean(card.find(".span10").contents().first().text());
      if (!name) return;
      const details = card
        .find(".span10 > div")
        .map((__, d) => clean($(d).text()))
        .get()
        .filter((t) => t && !/current pupil/i.test(t));
      siblings.push({
        name,
        photoUrl: proxiedPhoto(card.find("img").attr("src")),
        current: /current pupil/i.test(card.text()),
        details,
      });
    });
    return siblings;
  }

  async getNotices(): Promise<Notice[]> {
    const html: string = await this.asmx("PupilMailService", "GetUnreadMails", {});
    if (typeof html !== "string" || !html.trim()) return [];

    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    $("li a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const id = href.match(/noticeid=(\d+)/i)?.[1];
      if (!id) return;
      const titleEl = $(el).find(".msg-title");
      const sender = clean(titleEl.find(".blue").text()).replace(/:$/, "");
      const title = clean(titleEl.clone().find(".blue").remove().end().text());
      const dateText = clean($(el).find(".msg-time span").text());
      notices.push({
        id,
        sender: sender || "School office",
        title: title || "Notice",
        date: isoFromDmy(dateText) ?? "",
        photoUrl: proxiedPhoto($(el).find("img").attr("src")),
      });
    });
    return notices;
  }

  async getNotice(id: string): Promise<NoticeDetail> {
    const data = await this.asmx("PupilMailService", "GetNoticeDetail", {
      noticeId: id,
      isforward: false,
      isreply: false,
      isreplyall: false,
    });
    return {
      id,
      subject: String(data?.Subject ?? "Notice"),
      sender: String(data?.SentByName ?? data?.SentBy ?? "School"),
      date: String(data?.SentDate ?? "").slice(0, 10),
      bodyHtml: String(data?.Body ?? ""),
    };
  }

  async getPhoto(pid: string): Promise<{ buffer: Buffer; contentType: string }> {
    return this.fetchRaw(`/DBImage.axd?type=pupil&pid=${pid}`);
  }

  async getReportFile(report: Report): Promise<{ buffer: Buffer; contentType: string }> {
    if (!report.url) throw new EngageError("That report does not have a download link.");
    return this.fetchRaw(report.url);
  }

  async reauthenticate(): Promise<void> {
    await this.ensureSession();
  }

  /** Snapshot enough state to rebuild this client in another process. */
  exportState(): SerializedSession {
    const jar = this.jar.serializeSync();
    const cookies = (jar?.cookies ?? []).map((c) => ({
      k: String(c.key),
      v: String(c.value),
      d: c.domain ? String(c.domain) : undefined,
      p: c.path ? String(c.path) : undefined,
      e: c.expires && c.expires !== "Infinity" ? new Date(String(c.expires)).getTime() : undefined,
      s: Boolean(c.secure),
      h: Boolean(c.httpOnly),
    }));

    return {
      v: 1,
      school: this.base.replace(/^https:\/\//, "").replace(/\.engagehosted\.com$/, ""),
      cookies,
      pupilId: this.pupilId,
      user: this.user,
    };
  }

  /** Rebuild a client from a snapshot produced by exportState(). */
  static fromState(state: SerializedSession): EngageClient {
    const client = new EngageClient(state.school);
    const jar = CookieJar.deserializeSync({
      version: "tough-cookie@5.1.1",
      storeType: "MemoryCookieStore",
      rejectPublicSuffixes: true,
      cookies: state.cookies.map((c) => ({
        key: c.k,
        value: c.v,
        domain: c.d,
        path: c.p,
        expires: c.e ? new Date(c.e).toISOString() : "Infinity",
        secure: c.s,
        httpOnly: c.h,
      })),
    } as never);
    client.jar = jar;
    client.pupilId = state.pupilId ?? null;
    client.user = state.user ?? null;
    return client;
  }

  async fetchRaw(path: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!path.startsWith("/") || path.includes("://")) throw new EngageError("Invalid file path.");
    let url = new URL(path, this.base).href;

    for (let depth = 0; depth < 6; depth += 1) {
      const cookies = this.jar.getCookieStringSync(url);
      const res = await fetch(url, {
        headers: {
          cookie: cookies,
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          accept: "application/pdf,image/*,*/*;q=0.8",
          "accept-language": "en-GB,en;q=0.9",
          referer: `${this.base}/VLE/`,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
      });

      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url).href;
        continue;
      }
      if (res.status >= 400) throw new EngageError("That file is not available.");

      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      if (contentType.includes("text/html")) {
        const text = await res.text();
        if (this.looksLikeLogin(text, res.url || url)) throw new SessionExpiredError("Session expired.");
        throw new EngageError("That file is not available.");
      }

      return { buffer: Buffer.from(await res.arrayBuffer()), contentType };
    }

    throw new EngageError("That file is not available.");
  }
}
