import type {
  Notice,
  NoticeDetail,
  PointEntry,
  PointsPayload,
  PointsSummary,
  Report,
  SessionUser,
  Sibling,
  Timetable,
  TimetableDay,
  TimetableLesson,
} from "../shared/types.ts";
import type { Backend } from "./backend.ts";

export const DEMO_NOW = new Date("2026-11-03T09:12:00Z");

export const demoUser: SessionUser = {
  name: "Nirvaan Tandon",
  firstName: "Nirvaan",
  photoUrl: null,
};

type Spec = {
  kind?: "lesson" | "break";
  period?: string;
  subject: string;
  start: string;
  end: string;
  room?: string;
  teachers?: string[];
};

const PA = ["Mr Daniel Spence"];
const SLT = [
  "Mr Daniel Spence",
  "Mr Michael Barr",
  "Mr Jonathan Porter-Hughes",
  "Mr Keith Armstrong",
];

const weekA: Record<string, Spec[]> = {
  Monday: [
    { period: "1", subject: "Registration", start: "08:15", end: "08:45", room: "L1", teachers: PA },
    { period: "2", subject: "English", start: "08:45", end: "10:15", room: "EG9", teachers: ["Mr Michael Barr"] },
    { period: "4", subject: "Assembly", start: "10:15", end: "10:45", room: "CH1 (Caudwell Hall)", teachers: SLT },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "Mathematics", start: "11:05", end: "11:50", room: "TG2", teachers: ["Mr William Reed"] },
    { period: "7", subject: "Physics", start: "11:50", end: "12:35", room: "SW1 (Physics Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "8", subject: "Design & Technology", start: "12:35", end: "13:20", room: "MH8 (DT)", teachers: ["Mrs Leanne Hughes"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Study", start: "14:05", end: "14:50", room: "EG10", teachers: ["Mrs Virginia Wilding", "Mrs Fiona Rynhoud"] },
    { period: "11", subject: "Sport", start: "14:50", end: "16:25", room: "SH1 (Sports Hall)", teachers: ["Mr Charles Gingell", "Mr Scott Dewar"] },
  ],
  Tuesday: [
    { period: "1", subject: "Registration", start: "08:15", end: "08:45", room: "L1", teachers: PA },
    { period: "2", subject: "Business", start: "08:45", end: "10:15", room: "B1", teachers: ["Mr Will Reed"] },
    { period: "4", subject: "Mathematics", start: "10:15", end: "10:45", room: "TG2", teachers: ["Mr William Reed"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "English", start: "11:05", end: "11:50", room: "EG9", teachers: ["Mr Michael Barr"] },
    { period: "7", subject: "Chemistry", start: "11:50", end: "12:35", room: "SC4 (Chemistry Lab)", teachers: ["Mrs Hannah Clarke"] },
    { period: "8", subject: "Geography", start: "12:35", end: "13:20", room: "H2", teachers: ["Mr Tom Greenwood"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Biology", start: "14:05", end: "14:50", room: "SC2 (Biology Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "11", subject: "Sport", start: "14:50", end: "16:25", room: "SH1 (Sports Hall)", teachers: ["Mr Charles Gingell", "Mr Scott Dewar"] },
  ],
  Wednesday: [
    { period: "1", subject: "Registration", start: "08:15", end: "08:45", room: "L1", teachers: PA },
    { period: "2", subject: "Mathematics", start: "08:45", end: "10:15", room: "TG2", teachers: ["Mr William Reed"] },
    { period: "4", subject: "English", start: "10:15", end: "10:45", room: "EG9", teachers: ["Mr Michael Barr"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "Biology", start: "11:05", end: "11:50", room: "SC2 (Biology Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "7", subject: "Business", start: "11:50", end: "12:35", room: "B1", teachers: ["Mr Will Reed"] },
    { period: "8", subject: "Study", start: "12:35", end: "13:20", room: "EG10", teachers: ["Mrs Virginia Wilding"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Physics", start: "14:05", end: "14:50", room: "SW1 (Physics Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "11", subject: "Design & Technology", start: "14:50", end: "16:25", room: "MH8 (DT)", teachers: ["Mrs Leanne Hughes"] },
  ],
  Thursday: [
    { period: "1", subject: "Registration", start: "08:15", end: "08:45", room: "L1", teachers: PA },
    { period: "2", subject: "Physics", start: "08:45", end: "10:15", room: "SW1 (Physics Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "4", subject: "Mathematics", start: "10:15", end: "10:45", room: "TG2", teachers: ["Mr William Reed"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "English", start: "11:05", end: "11:50", room: "EG9", teachers: ["Mr Michael Barr"] },
    { period: "7", subject: "Chemistry", start: "11:50", end: "12:35", room: "SC4 (Chemistry Lab)", teachers: ["Mrs Hannah Clarke"] },
    { period: "8", subject: "Business", start: "12:35", end: "13:20", room: "B1", teachers: ["Mr Will Reed"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Geography", start: "14:05", end: "14:50", room: "H2", teachers: ["Mr Tom Greenwood"] },
    { period: "11", subject: "Study", start: "14:50", end: "16:25", room: "EG10", teachers: ["Mrs Fiona Rynhoud"] },
  ],
  Friday: [
    { period: "1", subject: "Registration", start: "08:15", end: "08:45", room: "L1", teachers: PA },
    { period: "2", subject: "English", start: "08:45", end: "10:15", room: "EG9", teachers: ["Mr Michael Barr"] },
    { period: "4", subject: "Mathematics", start: "10:15", end: "10:45", room: "TG2", teachers: ["Mr William Reed"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "Biology", start: "11:05", end: "11:50", room: "SC2 (Biology Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "7", subject: "Business", start: "11:50", end: "12:35", room: "B1", teachers: ["Mr Will Reed"] },
    { period: "8", subject: "Physics", start: "12:35", end: "13:20", room: "SW1 (Physics Lab)", teachers: ["Mrs Ide Berrios"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "PSHE", start: "14:05", end: "14:50", room: "CH2", teachers: ["Ms Nadine Watson"] },
    { period: "11", subject: "Sport", start: "14:50", end: "16:25", room: "SH1 (Sports Hall)", teachers: ["Mr Charles Gingell"] },
  ],
};

const weekB: Record<string, Spec[]> = {
  Monday: [
    weekA.Monday[0],
    { period: "2", subject: "Biology", start: "08:45", end: "10:15", room: "SC2 (Biology Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "4", subject: "Mathematics", start: "10:15", end: "10:45", room: "TG2", teachers: ["Mr William Reed"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "English", start: "11:05", end: "11:50", room: "EG9", teachers: ["Mr Michael Barr"] },
    { period: "7", subject: "Business", start: "11:50", end: "12:35", room: "B1", teachers: ["Mr Will Reed"] },
    { period: "8", subject: "Chemistry", start: "12:35", end: "13:20", room: "SC4 (Chemistry Lab)", teachers: ["Mrs Hannah Clarke"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Physics", start: "14:05", end: "14:50", room: "SW1 (Physics Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "11", subject: "Sport", start: "14:50", end: "16:25", room: "SH1 (Sports Hall)", teachers: ["Mr Scott Dewar"] },
  ],
  Tuesday: [
    weekA.Tuesday[0],
    { period: "2", subject: "Mathematics", start: "08:45", end: "10:15", room: "TG2", teachers: ["Mr William Reed"] },
    { period: "4", subject: "English", start: "10:15", end: "10:45", room: "EG9", teachers: ["Mr Michael Barr"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "Geography", start: "11:05", end: "11:50", room: "H2", teachers: ["Mr Tom Greenwood"] },
    { period: "7", subject: "Physics", start: "11:50", end: "12:35", room: "SW1 (Physics Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "8", subject: "English", start: "12:35", end: "13:20", room: "EG9", teachers: ["Mr Michael Barr"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Business", start: "14:05", end: "14:50", room: "B1", teachers: ["Mr Will Reed"] },
    { period: "11", subject: "Study", start: "14:50", end: "16:25", room: "EG10", teachers: ["Mrs Virginia Wilding"] },
  ],
  Wednesday: [
    weekA.Wednesday[0],
    { period: "2", subject: "Design & Technology", start: "08:45", end: "10:15", room: "MH8 (DT)", teachers: ["Mrs Leanne Hughes"] },
    { period: "4", subject: "Chemistry", start: "10:15", end: "10:45", room: "SC4 (Chemistry Lab)", teachers: ["Mrs Hannah Clarke"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "Mathematics", start: "11:05", end: "11:50", room: "TG2", teachers: ["Mr William Reed"] },
    { period: "7", subject: "English", start: "11:50", end: "12:35", room: "EG9", teachers: ["Mr Michael Barr"] },
    { period: "8", subject: "Business", start: "12:35", end: "13:20", room: "B1", teachers: ["Mr Will Reed"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Biology", start: "14:05", end: "14:50", room: "SC2 (Biology Lab)", teachers: ["Mrs Ide Berrios"] },
    { period: "11", subject: "Sport", start: "14:50", end: "16:25", room: "SH1 (Sports Hall)", teachers: ["Mr Charles Gingell"] },
  ],
  Thursday: [
    weekA.Thursday[0],
    { period: "2", subject: "Business", start: "08:45", end: "10:15", room: "B1", teachers: ["Mr Will Reed"] },
    { period: "4", subject: "Physics", start: "10:15", end: "10:45", room: "SW1 (Physics Lab)", teachers: ["Mrs Ide Berrios"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "Mathematics", start: "11:05", end: "11:50", room: "TG2", teachers: ["Mr William Reed"] },
    { period: "7", subject: "English", start: "11:50", end: "12:35", room: "EG9", teachers: ["Mr Michael Barr"] },
    { period: "8", subject: "Biology", start: "12:35", end: "13:20", room: "SC2 (Biology Lab)", teachers: ["Mrs Ide Berrios"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Chemistry", start: "14:05", end: "14:50", room: "SC4 (Chemistry Lab)", teachers: ["Mrs Hannah Clarke"] },
    { period: "11", subject: "Design & Technology", start: "14:50", end: "16:25", room: "MH8 (DT)", teachers: ["Mrs Leanne Hughes"] },
  ],
  Friday: [
    weekA.Friday[0],
    { period: "2", subject: "Geography", start: "08:45", end: "10:15", room: "H2", teachers: ["Mr Tom Greenwood"] },
    { period: "4", subject: "English", start: "10:15", end: "10:45", room: "EG9", teachers: ["Mr Michael Barr"] },
    { kind: "break", subject: "Break", start: "10:45", end: "11:05" },
    { period: "6", subject: "Mathematics", start: "11:05", end: "11:50", room: "TG2", teachers: ["Mr William Reed"] },
    { period: "7", subject: "Chemistry", start: "11:50", end: "12:35", room: "SC4 (Chemistry Lab)", teachers: ["Mrs Hannah Clarke"] },
    { period: "8", subject: "English", start: "12:35", end: "13:20", room: "EG9", teachers: ["Mr Michael Barr"] },
    { kind: "break", subject: "Lunch", start: "13:20", end: "14:05" },
    { period: "10", subject: "Study", start: "14:05", end: "14:50", room: "EG10", teachers: ["Mrs Fiona Rynhoud"] },
    { period: "11", subject: "Sport", start: "14:50", end: "16:25", room: "SH1 (Sports Hall)", teachers: ["Mr Mark Blissett"] },
  ],
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOLIDAY_WEEKS = new Set([
  "2026-10-26",
  "2026-12-21",
  "2026-12-28",
  "2027-02-15",
  "2027-04-05",
  "2027-05-31",
]);

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function demoTimetable(weekBeginning: string): Timetable {
  const weekIndex = Math.floor(Date.parse(`${weekBeginning}T00:00:00Z`) / (7 * 86400000));
  const isWeekB = Math.abs(weekIndex) % 2 === 1;
  const source = isWeekB ? weekB : weekA;
  const holiday = HOLIDAY_WEEKS.has(weekBeginning);

  const days: TimetableDay[] = DAYS.map((day, index) => {
    const date = addDays(weekBeginning, index);
    if (holiday) {
      return {
        date,
        day,
        note: "Autumn Half Term Break",
        lessons: [
          {
            id: `demo-${date}-holiday`,
            kind: "event",
            period: null,
            subject: "Autumn Half Term Break",
            start: "08:15",
            end: "16:25",
            room: null,
            teachers: [],
            image: null,
            color: null,
          },
        ],
      };
    }

    const lessons: TimetableLesson[] = source[day].map((spec, i) => ({
      id: `demo-${date}-${i}`,
      kind: spec.kind ?? "lesson",
      period: spec.period ?? null,
      subject: spec.subject,
      start: spec.start,
      end: spec.end,
      room: spec.room ?? null,
      teachers: spec.teachers ?? [],
      image: null,
      color: null,
    }));

    return { date, day, lessons, note: null };
  });

  return { weekBeginning, days };
}

const pointEntries: PointEntry[] = [
  {
    id: 125329,
    date: "2026-10-16",
    awardedBy: "Mr Will Reed",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Excelled in the Autumn 1 Assessment in Business.",
    points: 1,
  },
  {
    id: 124781,
    date: "2026-10-13",
    awardedBy: "Mrs Pip Brown",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Exceptional work as a student leader this term.",
    points: 3,
  },
  {
    id: 124651,
    date: "2026-10-09",
    awardedBy: "Mr Tom Greenwood",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Great work in Geography.",
    points: 1,
  },
  {
    id: 124102,
    date: "2026-10-02",
    awardedBy: "Mrs Ide Berrios",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Excellent practical write-up in Physics.",
    points: 1,
  },
  {
    id: 123880,
    date: "2026-09-29",
    awardedBy: "Mr William Reed",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Outstanding contribution in Mathematics.",
    points: 2,
  },
  {
    id: 123641,
    date: "2026-09-22",
    awardedBy: "Mrs Leanne Hughes",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Superb design work in Design & Technology.",
    points: 1,
  },
  {
    id: 123402,
    date: "2026-09-15",
    awardedBy: "Mrs Pip Brown",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Outstanding leadership at the Year 6 Open Evening.",
    points: 1,
  },
  {
    id: 123118,
    date: "2026-09-08",
    awardedBy: "Mr Michael Barr",
    type: "Eaton Grange Behaviour / Merit",
    category: "Eaton Grange Behaviour",
    notes: "Thoughtful analysis in English.",
    points: 1,
  },
];

function summarise(entries: PointEntry[]): PointsSummary {
  const positive = entries.filter((entry) => entry.points > 0).reduce((sum, entry) => sum + entry.points, 0);
  const negative = entries.filter((entry) => entry.points < 0).reduce((sum, entry) => sum + entry.points, 0);
  return {
    positive,
    negative,
    total: positive + negative,
    from: entries.length ? entries[entries.length - 1].date : "2026-09-01",
    to: entries.length ? entries[0].date : "2027-07-07",
  };
}

export function demoPoints(from?: string, to?: string): PointsPayload {
  const entries = pointEntries
    .filter((entry) => (!from || entry.date >= from) && (!to || entry.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date));
  return { summary: summarise(entries), entries };
}

const reports: Report[] = [
  {
    id: "demo-1",
    title: "Year 11 Predicted Grades",
    academicYear: "2026/2027",
    createdDate: "2026-10-02",
    url: "",
    fileName: "year-11-predicted-grades.pdf",
  },
  {
    id: "demo-2",
    title: "Autumn 1 Attainment Report",
    academicYear: "2026/2027",
    createdDate: "2026-10-16",
    url: "",
    fileName: "autumn-1-attainment.pdf",
  },
  {
    id: "demo-3",
    title: "End of Year Report",
    academicYear: "2025/2026",
    createdDate: "2026-07-08",
    url: "",
    fileName: "end-of-year-report.pdf",
  },
  {
    id: "demo-4",
    title: "Summer Term Report",
    academicYear: "2025/2026",
    createdDate: "2026-05-22",
    url: "",
    fileName: "summer-term-report.pdf",
  },
  {
    id: "demo-5",
    title: "Spring Term Report",
    academicYear: "2025/2026",
    createdDate: "2026-03-27",
    url: "",
    fileName: "spring-term-report.pdf",
  },
  {
    id: "demo-6",
    title: "Autumn Term Report",
    academicYear: "2025/2026",
    createdDate: "2025-12-12",
    url: "",
    fileName: "autumn-term-report.pdf",
  },
];

const noticeBodies: Record<string, string> = {
  "demo-n1": `<p>Dear Year 11,</p>
<p>The mock examination timetable is now available. Mocks begin on <strong>Monday 16 November</strong> and run through <strong>Friday 27 November</strong>.</p>
<p>Please check the following carefully:</p>
<ul><li>Exams take place in the Sports Hall unless your teacher tells you otherwise.</li><li>Arrive at least 10 minutes before each session with clear water and black pens.</li><li>If you have two exams in one day, lunch will be provided in the dining hall.</li></ul>
<p>A printed copy will be given to you during registration. Speak to your form tutor if you have a clash.</p>
<p>Good luck — you have worked hard for this.</p>
<p><em>Mrs Pip Brown</em><br>Deputy Head (Academic)</p>`,
  "demo-n2": `<p>Autumn term reports are now available to view and download in the portal.</p>
<p>Reports include your attainment grades, effort grades and tutor comment. Please read them with your parents and note any targets set by your teachers.</p>
<p>If you have a question about a subject comment, speak to that teacher directly.</p>`,
  "demo-n3": `<p>Our Sixth Form Open Evening takes place on <strong>Tuesday 10 November, 18:00–20:00</strong> in the Caudwell Hall.</p>
<p>You will be able to meet subject leaders, hear about the application process and tour the Sixth Form centre. Parents and carers are very welcome.</p>
<p>Please register your interest at reception.</p>`,
  "demo-n4": `<p>Friday 23 October is a charity non-uniform day. Bring £2 and wear something comfortable — no hoodies, and school shoes still apply.</p>
<p>All proceeds go to our partner charity, The Food Share.</p>`,
  "demo-n5": `<p>Congratulations to everyone who received an Eaton Grange merit this half term. Our celebration breakfast will take place on the last Friday of term.</p>
<p>Keep up the excellent effort.</p>`,
  "demo-n6": `<p>The Under 16 football fixture against Luckley House will now be played at home on Wednesday 4 November, kick-off 14:30.</p>
<p>Players should meet at the Sports Hall at 13:45 changed and ready.</p>`,
};

const notices: Notice[] = [
  { id: "demo-n1", sender: "Mrs Pip Brown", title: "Year 11 mock examination timetable", date: "2026-10-30", photoUrl: null },
  { id: "demo-n2", sender: "Mr Daniel Spence", title: "Autumn term reports are now available", date: "2026-10-28", photoUrl: null },
  { id: "demo-n3", sender: "Mrs Sarah Whitfield", title: "Sixth Form Open Evening – Tuesday 10 November", date: "2026-10-24", photoUrl: null },
  { id: "demo-n4", sender: "Mr Mark Spalton", title: "Charity non-uniform day", date: "2026-10-20", photoUrl: null },
  { id: "demo-n5", sender: "Mrs Pip Brown", title: "Eaton Grange merit celebration", date: "2026-10-16", photoUrl: null },
  { id: "demo-n6", sender: "Mr Charles Gingell", title: "Football fixture change", date: "2026-10-12", photoUrl: null },
];

const siblings: Sibling[] = [
  {
    name: "Tandon, Siddhan",
    photoUrl: null,
    current: false,
    details: ["Year 9", "9MB", "Severn House", "Date of birth 06/08/2013"],
  },
];

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function demoReportPdf(report: Report): Buffer {
  const lines = [
    "Demo School",
    report.title,
    `Academic year ${report.academicYear}`,
    `Generated ${report.createdDate}`,
    "",
    "This is a demonstration document.",
    "The real PDF is served from the school portal.",
  ];
  let content = "";
  lines.forEach((line, index) => {
    const font = index === 0 ? "/F2" : "/F1";
    const size = index === 0 ? 24 : index === 1 ? 18 : 12;
    content += `${font} ${size} Tf 1 0 0 1 72 ${740 - index * 30} Tm (${pdfEscape(line)}) Tj\n`;
  });
  content += "ET";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(out));
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

export class DemoBackend implements Backend {
  user = demoUser;

  getUser(): SessionUser {
    return demoUser;
  }

  async getTimetable(week?: string): Promise<Timetable> {
    const monday = week ?? "2026-11-02";
    return demoTimetable(monday);
  }

  async getPoints(from?: string, to?: string): Promise<PointsPayload> {
    return demoPoints(from, to);
  }

  async getReports(): Promise<Report[]> {
    return reports;
  }

  async getNotices(): Promise<Notice[]> {
    return notices;
  }

  async getNotice(id: string): Promise<NoticeDetail> {
    const notice = notices.find((item) => item.id === id) ?? notices[0];
    return {
      id: notice.id,
      subject: notice.title,
      sender: notice.sender,
      date: notice.date,
      bodyHtml: noticeBodies[id] ?? noticeBodies[notice.id] ?? "<p>Notice</p>",
    };
  }

  async getSiblings(): Promise<Sibling[]> {
    return siblings;
  }

  async getPhoto(): Promise<{ buffer: Buffer; contentType: string }> {
    return { buffer: transparentPng, contentType: "image/png" };
  }

  async getReportFile(report: Report): Promise<{ buffer: Buffer; contentType: string }> {
    return { buffer: demoReportPdf(report), contentType: "application/pdf" };
  }

  findReport(id: string): Report | undefined {
    return reports.find((report) => report.id === id);
  }
}
