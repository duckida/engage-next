process.env.SESSION_SECRET = "mock-secret-0123456789abcdefgh";
const express = (await import("express")).default;
const { default: app } = await import("./api/index.js");
app.get("/api/timetable", (req, res) => res.json({
  weekBeginning: "not-a-date",
  days: [
    { date: "not-a-date", day: "Monday", lessons: [], note: null },
    { date: "2026-11-03", day: "Tuesday", lessons: [], note: "Half term" },
  ],
}));
app.get("/api/dashboard", (req, res) => res.json({
  user: { name: "Test Pupil", firstName: "Test", photoUrl: null },
  today: { date: "not-a-date", day: "Monday", lessons: [], note: null },
  currentLesson: null, nextLesson: null,
  points: { positive: 0, negative: 0, total: 0, from: "", to: "" },
  recentPoints: [], reports: 0, unread: 0,
  weekBeginning: "not-a-date", nowIso: "not-a-date",
}));
app.use(express.static("./dist", { index: false }));
app.get("*", (q, s, n) => q.path.startsWith("/api") ? n() : s.sendFile(process.cwd() + "/dist/index.html"));
app.listen(9991, "127.0.0.1", () => console.log("mock up"));
