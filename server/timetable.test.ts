import assert from "node:assert/strict";
import { parseTimetable } from "../server/engage.ts";

const lessonCell = (period: string, subject: string, time: string, room: string, teacher: string) => `
  <td class="ttCard period Weekly">
    <div class="ttLessonText">Lesson ${period}<br>${subject}<br>${time}<br>${room}<br>${teacher}</div>
  </td>`;

const breakCell = `<td class="break timed"><div>10:45<br>11:05</div></td>`;

/** Modern layout: day name in a <td>, week label with a month name. */
const monthNameLabel = `
<html><body>
<span id="ctl00_PageContent_weeklyTimetable_lblWeek">Week Beginning 02 November 2026</span>
<table id="tblTimeTable_ctl00_PageContent_weeklyTimetable">
  <tr><th>Day</th><th>1</th><th>2</th><th>3</th></tr>
  <tr>
    <td>Monday</td>
    ${lessonCell("1", "Registration", "08:15 - 08:45", "L1", "Mr Daniel Spence")}
    ${lessonCell("2", "Biology", "08:45 - 10:15", "SC2", "Mrs Ide Berrios")}
    ${breakCell}
  </tr>
  <tr>
    <td>Tuesday</td>
    ${lessonCell("1", "Registration", "08:15 - 08:45", "L1", "Mr Daniel Spence")}
    ${lessonCell("2", "Mathematics", "08:45 - 10:15", "TG2", "Mr William Reed")}
    ${breakCell}
  </tr>
</table>
</body></html>`;

/** Legacy layout: day name in a <th>, DD/MM/YYYY label, day + date in one cell. */
const thDayLabel = `
<html><body>
<span id="lblWeek">Week Beginning 02/11/2026</span>
<table id="tblTimeTable">
  <tr><td></td><td>1</td><td>2</td></tr>
  <tr>
    <th>Monday 2 November</th>
    ${lessonCell("1", "Registration", "08:15 - 08:45", "L1", "Mr Daniel Spence")}
    ${lessonCell("2", "English", "08:45 - 10:15", "EG9", "Mr Michael Barr")}
  </tr>
  <tr>
    <th>Tuesday 3 November</th>
    ${lessonCell("1", "Registration", "08:15 - 08:45", "L1", "Mr Daniel Spence")}
    ${lessonCell("2", "Chemistry", "08:45 - 10:15", "CH1", "Mrs Ide Berrios")}
  </tr>
</table>
</body></html>`;

// --- Modern layout, month-name week label ---
const a = parseTimetable(monthNameLabel);
assert.equal(a.weekBeginning, "2026-11-02", "month-name label should parse to an ISO week start");
assert.equal(a.days.length, 2, "should read both day rows");
assert.equal(a.days[0].day, "Monday");
assert.equal(a.days[0].date, "2026-11-02");
assert.equal(a.days[1].date, "2026-11-03");
assert.equal(a.days[0].lessons[0].subject, "Registration");
assert.equal(a.days[0].lessons[1].subject, "Biology");
assert.equal(a.days[0].lessons[1].start, "08:45");
assert.equal(a.days[0].lessons[1].end, "10:15");
assert.equal(a.days[0].lessons[1].room, "SC2");
assert.ok(a.days[0].lessons.some((l) => l.kind === "break"), "break cell should be captured");

// --- Legacy layout, <th> day cell with a date ---
const b = parseTimetable(thDayLabel);
assert.equal(b.weekBeginning, "2026-11-02", "DD/MM/YYYY label should parse");
assert.equal(b.days.length, 2, "day names in <th> should still be read");
assert.equal(b.days[0].day, "Monday");
assert.equal(b.days[1].day, "Tuesday");
assert.equal(b.days[0].lessons[1].subject, "English");

// --- A page with no table at all must throw, not return an empty week ---
assert.throws(() => parseTimetable("<html><body>nothing</body></html>"), /not present|layout/i);

// --- A table with no recognisable days must throw ---
assert.throws(
  () => parseTimetable(`<table id="tblTimeTable"><tr><td>a</td><td>b</td></tr></table>`),
  /layout|read/i,
);

console.log("timetable parser: all checks passed");
