import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitmqModule],
  controllers: [EventController],
})
export class EventModule {}
