import { NotFoundException } from '@nestjs/common';

import { FixtureReportsDataSource } from './fixture-reports.datasource';
import type { CallerContext } from './reports.datasource';

const admin: CallerContext = {
  sub: 'user-1',
  email: 'admin@example.com',
  role: 'admin',
};

describe('FixtureReportsDataSource', () => {
  let source: FixtureReportsDataSource;

  beforeEach(() => {
    source = new FixtureReportsDataSource();
  });

  describe('workshopSummaries', () => {
    it('returns the shape the SD-Group 8 spec documents', async () => {
      const [first] = await source.workshopSummaries(admin);

      // Verbatim from the spec's sample data.
      expect(first).toEqual({
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
      });
    });

    it('does not hand out a reference callers could mutate', async () => {
      const first = await source.workshopSummaries(admin);
      first[0].total_enrolled = 9999;

      const second = await source.workshopSummaries(admin);
      expect(second[0].total_enrolled).toBe(32);
    });
  });

  describe('passFail', () => {
    it('returns the pass/fail breakdown and nothing else', async () => {
      const report = await source.passFail('WS-2025-001', admin);

      expect(report).toEqual({
        workshop_id: 'WS-2025-001',
        total_passed: 24,
        total_failed: 8,
      });
    });
  });

  describe('attendance', () => {
    it('reports each day with absentees and a rate', async () => {
      const report = await source.attendance('WS-2025-001', admin);

      expect(report.days).toHaveLength(3);
      expect(report.days[0]).toEqual({
        day: 1,
        attended: 30,
        absent: 2,
        rate: 0.938,
      });
      expect(report.days[2]).toEqual({
        day: 3,
        attended: 27,
        absent: 5,
        rate: 0.844,
      });
    });

    it('averages the daily rates', async () => {
      const report = await source.attendance('WS-2025-001', admin);

      expect(report.average_attendance_rate).toBeCloseTo(0.885, 2);
    });
  });

  describe('feedback', () => {
    it('totals the responses from the rating breakdown', async () => {
      const report = await source.feedback('WS-2025-001', admin);

      expect(report.average_rating).toBe(4.6);
      expect(report.responses).toBe(27);
      expect(report.rating_breakdown['5']).toBe(19);
    });
  });

  describe('certificates', () => {
    it('sums issued certificates across every workshop', async () => {
      const report = await source.certificates(admin);

      expect(report.by_workshop).toHaveLength(2);
      expect(report.total_issued).toBe(43); // 24 + 19
    });
  });

  it.each([
    ['passFail', () => source.passFail('WS-DOES-NOT-EXIST', admin)],
    ['attendance', () => source.attendance('WS-DOES-NOT-EXIST', admin)],
    ['feedback', () => source.feedback('WS-DOES-NOT-EXIST', admin)],
  ])('%s rejects an unknown workshop with 404', async (_name, call) => {
    await expect(call()).rejects.toBeInstanceOf(NotFoundException);
  });
});
