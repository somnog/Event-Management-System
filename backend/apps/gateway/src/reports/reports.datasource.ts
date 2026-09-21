/**
 * The seam between the reporting endpoints and where their numbers come from.
 *
 * Today this is backed by fixtures (see fixture-reports.datasource.ts) because
 * Groups 1, 6 and 7 have not shipped yet. When they do, add an
 * RmqReportsDataSource that aggregates their real responses and swap the
 * provider in reports.module.ts. No controller, route, response shape or
 * frontend code should need to change.
 *
 * Every method takes the caller so an implementation can scope results to that
 * user. Admins see everything; a facilitator should eventually see only their
 * own workshops. The gateway cannot enforce that alone -- it needs the owning
 * service to tell it who runs which workshop -- so for now the parameter exists
 * to keep the contract honest rather than to filter.
 */

export interface CallerContext {
  /** The user's id, from the JWT `sub` claim. */
  sub: string;
  email: string;
  role: string;
}

export interface WorkshopSummary {
  workshop_id: string;
  title: string;
  total_enrolled: number;
  total_attended_day1: number;
  total_attended_day2: number;
  total_attended_day3: number;
  total_passed: number;
  total_failed: number;
  certificates_issued: number;
  average_feedback_rating: number;
}

export interface PassFailReport {
  workshop_id: string;
  total_passed: number;
  total_failed: number;
}

export interface AttendanceReport {
  workshop_id: string;
  title: string;
  total_enrolled: number;
  days: { day: number; attended: number; absent: number; rate: number }[];
  average_attendance_rate: number;
}

export interface FeedbackReport {
  workshop_id: string;
  title: string;
  responses: number;
  average_rating: number;
  rating_breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface CertificatesReport {
  total_issued: number;
  by_workshop: { workshop_id: string; title: string; issued: number }[];
}

export interface ReportsDataSource {
  workshopSummaries(caller: CallerContext): Promise<WorkshopSummary[]>;
  passFail(workshopId: string, caller: CallerContext): Promise<PassFailReport>;
  attendance(
    workshopId: string,
    caller: CallerContext,
  ): Promise<AttendanceReport>;
  feedback(workshopId: string, caller: CallerContext): Promise<FeedbackReport>;
  certificates(caller: CallerContext): Promise<CertificatesReport>;
}

/** DI token. Injected with @Inject(REPORTS_DATA_SOURCE). */
export const REPORTS_DATA_SOURCE = 'REPORTS_DATA_SOURCE';
