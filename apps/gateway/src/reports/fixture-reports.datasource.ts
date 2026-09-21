import { Injectable, NotFoundException } from '@nestjs/common';

import {
  AttendanceReport,
  CallerContext,
  CertificatesReport,
  FeedbackReport,
  PassFailReport,
  ReportsDataSource,
  WorkshopSummary,
} from './reports.datasource';

/**
 * Placeholder data, used until Groups 1, 6 and 7 ship their services.
 *
 * WS-2025-001 is copied verbatim from the sample data in the SD-Group 8 spec,
 * so the response shape matches what the spec documents. WS-2025-002 is made
 * up, purely so list endpoints return more than one row and the dashboard has
 * something to sort and compare.
 *
 * NOTHING HERE IS REAL. Replace this provider, not the controllers.
 */
const WORKSHOPS: WorkshopSummary[] = [
  {
    workshop_id: 'WS-2025-001',
    title: 'Introduction to Web Development',
    total_enrolled: 32,
    total_attended_day1: 30,
    total_attended_day2: 28,
    total_attended_day3: 27,
    total_passed: 24,
    total_failed: 8,
    certificates_issued: 24,
    average_feedback_rating: 4.6,
  },
  {
    workshop_id: 'WS-2025-002',
    title: 'Mobile App Fundamentals',
    total_enrolled: 25,
    total_attended_day1: 24,
    total_attended_day2: 22,
    total_attended_day3: 21,
    total_passed: 19,
    total_failed: 6,
    certificates_issued: 19,
    average_feedback_rating: 4.2,
  },
];

/** Plausible 1-5 star spread that averages out to the summary's rating. */
const RATING_BREAKDOWN: Record<
  string,
  Record<'1' | '2' | '3' | '4' | '5', number>
> = {
  'WS-2025-001': { '1': 0, '2': 1, '3': 2, '4': 5, '5': 19 },
  'WS-2025-002': { '1': 0, '2': 1, '3': 3, '4': 7, '5': 10 },
};

const round = (value: number) => Math.round(value * 1000) / 1000;

@Injectable()
export class FixtureReportsDataSource implements ReportsDataSource {
  async workshopSummaries(_caller: CallerContext): Promise<WorkshopSummary[]> {
    return WORKSHOPS.map((workshop) => ({ ...workshop }));
  }

  async passFail(
    workshopId: string,
    _caller: CallerContext,
  ): Promise<PassFailReport> {
    const workshop = this.require(workshopId);
    const assessed = workshop.total_passed + workshop.total_failed;

    return {
      workshop_id: workshop.workshop_id,
      title: workshop.title,
      total_assessed: assessed,
      total_passed: workshop.total_passed,
      total_failed: workshop.total_failed,
      pass_rate: assessed === 0 ? 0 : round(workshop.total_passed / assessed),
    };
  }

  async attendance(
    workshopId: string,
    _caller: CallerContext,
  ): Promise<AttendanceReport> {
    const workshop = this.require(workshopId);
    const attended = [
      workshop.total_attended_day1,
      workshop.total_attended_day2,
      workshop.total_attended_day3,
    ];

    const days = attended.map((count, index) => ({
      day: index + 1,
      attended: count,
      absent: workshop.total_enrolled - count,
      rate:
        workshop.total_enrolled === 0
          ? 0
          : round(count / workshop.total_enrolled),
    }));

    const averageRate =
      days.length === 0
        ? 0
        : round(days.reduce((sum, day) => sum + day.rate, 0) / days.length);

    return {
      workshop_id: workshop.workshop_id,
      title: workshop.title,
      total_enrolled: workshop.total_enrolled,
      days,
      average_attendance_rate: averageRate,
    };
  }

  async feedback(
    workshopId: string,
    _caller: CallerContext,
  ): Promise<FeedbackReport> {
    const workshop = this.require(workshopId);
    const breakdown = RATING_BREAKDOWN[workshop.workshop_id] ?? {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    return {
      workshop_id: workshop.workshop_id,
      title: workshop.title,
      responses: Object.values(breakdown).reduce((sum, n) => sum + n, 0),
      average_rating: workshop.average_feedback_rating,
      rating_breakdown: breakdown,
    };
  }

  async certificates(_caller: CallerContext): Promise<CertificatesReport> {
    return {
      total_issued: WORKSHOPS.reduce((sum, w) => sum + w.certificates_issued, 0),
      by_workshop: WORKSHOPS.map((workshop) => ({
        workshop_id: workshop.workshop_id,
        title: workshop.title,
        issued: workshop.certificates_issued,
      })),
    };
  }

  private require(workshopId: string): WorkshopSummary {
    const workshop = WORKSHOPS.find((w) => w.workshop_id === workshopId);

    if (!workshop) {
      throw new NotFoundException(`No workshop with id ${workshopId}`);
    }

    return workshop;
  }
}
