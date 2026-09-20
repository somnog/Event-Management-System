import { Module } from '@nestjs/common';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [RabbitmqModule],
  controllers: [AuthController],
  providers: [],
})
export class AuthModule {}
