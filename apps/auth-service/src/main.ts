import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';


async function bootstrap() {
 const rabbitmqUrl = process.env.RABBITMQ_URL;
 console.log('RABBITMQ_URL:', rabbitmqUrl);

  if (!rabbitmqUrl) {
    throw new Error('RABBITMQ_URL is not defined');
  }
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'event_queue',
        queueOptions: { durable: true },
      },
    },
  );
  await app.listen();
}
bootstrap();
