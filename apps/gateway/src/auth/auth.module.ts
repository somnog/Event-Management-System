import { Module } from '@nestjs/common';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { AuthController } from './auth.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [RabbitmqModule],
  controllers: [AuthController],
  providers: [AccessTokenGuard, RolesGuard],
})
export class AuthModule {}
