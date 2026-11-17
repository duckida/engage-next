import assert from "node:assert/strict";
import { EngageClient } from "./engage.ts";

/**
 * The whole point of this file is round-trips: every avoided portal request is
 * latency the pupil does not wait for. The stubbed fetch below counts calls and
 * lets a "portal" behave like the real thing (one week per page, week picker
 * postbacks).
 */

const PICKER = "ctl00$PageContent$weeklyTimetable$dpWeekSelectorStartDate$dateInput";

function dmy(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function page(weekIso: string): string {
  return `<html><body>
    <span id="ctl00_PageContent_weeklyTimetable_lblWeek">Week Beginning ${dmy(weekIso)}</span>
    <form id="aspnetForm" name="aspnetForm">
      <input type="hidden" name="__VIEWSTATE" value="viewstate" />
      <input type="hidden" name="__EVENTVALIDATION" value="validation" />
      <input type="text" name="${PICKER}" value="${dmy(weekIso)}" />
      <input type="hidden" name="${PICKER}_ClientState" value="{}" />
    </form>
    <table id="tblTimeTable">
      <tr><td></td><td>1</td></tr>
      <tr>
        <td>Monday</td>
        <td class="ttCard">
          <div class="ttLessonText">Lesson 1<br>English<br>08:15 - 08:45<br>L1<br>Mr Barr</div>
        </td>
      </tr>
    </table>
  </body></html>`;
}

type Call = { method: string; url: string; body: string };

const calls: Call[] = [];
let saturdayOnly = false;

const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init.method ?? "GET").toUpperCase();
  const body = typeof init.body === "string" ? init.body : "";
  calls.push({ method, url, body });

  const headers = { "content-type": "text/html" };

  if (method === "GET") return new Response(page("2026-11-02"), { status: 200, headers });

  const sent = new URLSearchParams(body).get(PICKER) ?? "";
  if (saturdayOnly) {
    // This skin ignores Monday's date; it only moves when sent the Saturday.
    const match = sent.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    let monday: string | null = null;
    if (match) {
      const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12));
      if (date.getUTCDay() === 6) {
        date.setUTCDate(date.getUTCDate() - 5);
        monday = date.toISOString().slice(0, 10);
      }
    }
    return new Response(page(monday ?? "2026-11-02"), { status: 200, headers });
  }

  const [day, month, year] = sent.split("/");
  return new Response(page(`${year}-${month}-${day}`), { status: 200, headers });
}) as typeof fetch;

function reset(onlySaturday = false) {
  calls.length = 0;
  saturdayOnly = onlySaturday;
}

// --- The requested week is already on the page: no postback at all ---
reset();
const client = new EngageClient("demo-school");
const current = await client.getTimetable("2026-11-02");
assert.equal(current.weekBeginning, "2026-11-02");
assert.equal(calls.length, 1, "current week should only need the GET");
assert.equal(calls[0].method, "GET");

// --- A different week needs one GET and one successful POST ---
reset();
const other = await client.getTimetable("2026-11-09");
assert.equal(other.weekBeginning, "2026-11-09");
assert.equal(calls.length, 2, "a different week should need GET + one POST");
assert.equal(calls[1].method, "POST");
assert.equal(client.picker?.label, "monday-dmy-input", "the working picker should be remembered");

// --- A skin that needs the Saturday probe learns it, then stops probing ---
reset(true);
const picky = new EngageClient("picky-school");
const first = await picky.getTimetable("2026-11-09");
assert.equal(first.weekBeginning, "2026-11-09");
assert.equal(calls.filter((call) => call.method === "POST").length, 2, "first week probes twice");
assert.equal(picky.picker?.label, "saturday-dmy-input");

reset(true);
const remembered = await picky.getTimetable("2026-11-16");
assert.equal(remembered.weekBeginning, "2026-11-16");
assert.equal(
  calls.filter((call) => call.method === "POST").length,
  1,
  "a remembered picker should be tried first",
);

globalThis.fetch = realFetch;
console.log("engage client: request counts and picker learning passed");
