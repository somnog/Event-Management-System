import { Module } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FixtureReportsDataSource } from './fixture-reports.datasource';
import { ReportsController } from './reports.controller';
import { REPORTS_DATA_SOURCE } from './reports.datasource';

@Module({
  controllers: [ReportsController],
  providers: [
    AccessTokenGuard,
    RolesGuard,
    // Swap this one line for an RmqReportsDataSource once Groups 1, 6 and 7
    // ship. Nothing else in this module should need to change.
    { provide: REPORTS_DATA_SOURCE, useClass: FixtureReportsDataSource },
  ],
})
export class ReportsModule {}
