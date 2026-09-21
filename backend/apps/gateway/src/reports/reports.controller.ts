import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { REPORTS_DATA_SOURCE } from './reports.datasource';
// `isolatedModules` + `emitDecoratorMetadata` require types used in a decorated
// signature to be imported as types (TS1272).
import type {
  CallerContext,
  ReportsDataSource,
} from './reports.datasource';

/** What AccessTokenGuard attaches to the request. */
interface AuthenticatedRequest {
  user: CallerContext;
}

/**
 * Reporting endpoints required by the SD-Group 8 spec.
 *
 * Access follows the spec's permission table: admin has "full access to all
 * services and reports", and facilitator has "read access to schedules,
 * sessions, and participant attendance" -- which is why attendance is the one
 * report a facilitator may read. Participants get their own results and
 * certificates from the owning services, not from these aggregates.
 */
@Controller('reports')
@UseGuards(AccessTokenGuard, RolesGuard)
export class ReportsController {
  constructor(
    @Inject(REPORTS_DATA_SOURCE)
    private readonly reports: ReportsDataSource,
  ) {}

  @Get('workshops')
  @Roles('admin')
  workshops(@Req() request: AuthenticatedRequest) {
    return this.reports.workshopSummaries(request.user);
  }

  @Get('pass-fail/:workshopId')
  @Roles('admin')
  passFail(
    @Param('workshopId') workshopId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reports.passFail(workshopId, request.user);
  }

  @Get('attendance/:workshopId')
  @Roles('admin', 'facilitator')
  attendance(
    @Param('workshopId') workshopId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reports.attendance(workshopId, request.user);
  }

  @Get('feedback/:workshopId')
  @Roles('admin')
  feedback(
    @Param('workshopId') workshopId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reports.feedback(workshopId, request.user);
  }

  @Get('certificates')
  @Roles('admin')
  certificates(@Req() request: AuthenticatedRequest) {
    return this.reports.certificates(request.user);
  }
}
