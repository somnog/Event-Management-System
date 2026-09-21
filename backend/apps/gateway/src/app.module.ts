import { Module } from '@nestjs/common';
import 'dotenv/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventModule } from './event/event.module';
import { CategoryModule } from './category/category.module';
import { AuthModule } from './auth/auth.module';
import { ReportsModule } from './reports/reports.module';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './auth/guards/access-token.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    EventModule,
    CategoryModule,
    AuthModule,
    ReportsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      global: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AccessTokenGuard,
    RolesGuard,
  ],
})
export class AppModule {}
