import type {
  Notice,
  NoticeDetail,
  PointsPayload,
  Report,
  SessionUser,
  Sibling,
  Timetable,
} from "../shared/types.ts";

/**
 * Everything the API needs from a portal connection. The real implementation
 * talks to <school>.engagehosted.com; the demo implementation reads fixtures.
 */
export interface Backend {
  getUser(): SessionUser;
  getTimetable(week?: string): Promise<Timetable>;
  getPoints(from?: string, to?: string): Promise<PointsPayload>;
  getReports(): Promise<Report[]>;
  getNotices(): Promise<Notice[]>;
  getNotice(id: string): Promise<NoticeDetail>;
  getSiblings(): Promise<Sibling[]>;
  getPhoto(pid: string): Promise<{ buffer: Buffer; contentType: string }>;
  getReportFile(report: Report): Promise<{ buffer: Buffer; contentType: string }>;
  /** Re-run the portal login after the session cookie expires. */
  reauthenticate?(): Promise<void>;
}
