import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';

async function bootstrap() {
  const rabbitmqUrl = process.env.RABBITMQ_URL;

  if (!rabbitmqUrl) {
    throw new Error('RABBITMQ_URL is not defined');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: process.env.AUTH_QUEUE ?? 'auth_queue',
        queueOptions: { durable: true },
      },
    },
  );

  // Without this, DTO decorators are inert: a payload missing `passwordHash`
  // reaches bcrypt.hash(undefined) and throws a raw, unmapped error.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new RpcException({
          statusCode: 400,
          message: errors.flatMap((error) =>
            Object.values(error.constraints ?? {}),
          ),
          error: 'Bad Request',
        }),
    }),
  );

  await app.listen();
}
bootstrap();
