export type SessionUser = {
  name: string;
  firstName: string;
  photoUrl: string | null;
};

export type PointEntry = {
  id: number;
  date: string;
  awardedBy: string;
  type: string;
  category: string;
  notes: string;
  points: number;
};

export type PointsSummary = {
  positive: number;
  negative: number;
  total: number;
  from: string;
  to: string;
};

export type PointsPayload = {
  summary: PointsSummary;
  entries: PointEntry[];
};

export type LessonKind = "lesson" | "break" | "event";

export type TimetableLesson = {
  id: string;
  kind: LessonKind;
  period: string | null;
  subject: string;
  start: string;
  end: string;
  room: string | null;
  teachers: string[];
  image: string | null;
  color: string | null;
};

export type TimetableDay = {
  date: string;
  day: string;
  lessons: TimetableLesson[];
  note: string | null;
};

export type Timetable = {
  weekBeginning: string;
  days: TimetableDay[];
};

export type Report = {
  id: string;
  title: string;
  academicYear: string;
  createdDate: string;
  url: string;
  fileName: string;
};

export type Notice = {
  id: string;
  sender: string;
  title: string;
  date: string;
  photoUrl: string | null;
};

export type NoticeDetail = {
  id: string;
  subject: string;
  sender: string;
  date: string;
  bodyHtml: string;
};

export type Sibling = {
  name: string;
  photoUrl: string | null;
  current: boolean;
  details: string[];
};

export type DashboardPayload = {
  user: SessionUser;
  today: TimetableDay | null;
  currentLesson: TimetableLesson | null;
  nextLesson: TimetableLesson | null;
  points: PointsSummary;
  recentPoints: PointEntry[];
  reports: number;
  unread: number;
  weekBeginning: string;
  nowIso: string;
};

export type MePayload = {
  user: SessionUser;
  demo: boolean;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
