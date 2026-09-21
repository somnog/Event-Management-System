import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import 'dotenv/config';

const rabbitmqUrl = process.env.RABBITMQ_URL;

if (!rabbitmqUrl) {
  throw new Error('rabbitMq url not found');
}

// Each service consumes its OWN queue. Sharing one queue makes the services
// compete for every message, so auth requests can be delivered to a service
// that has no handler for them.
export const AUTH_QUEUE = process.env.AUTH_QUEUE ?? 'auth_queue';
export const EVENT_QUEUE = process.env.EVENT_QUEUE ?? 'event_queue';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'EVENT_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: EVENT_QUEUE,
          queueOptions: { durable: true },
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: AUTH_QUEUE,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitmqModule {}
