import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import 'dotenv/config';

const rabbitmqUrl = process.env.RABBITMQ_URL;

if (!rabbitmqUrl) {
  throw new Error('rabbitMq url not found');
}
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'EVENT_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: 'event_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: 'event_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitmqModule {}
