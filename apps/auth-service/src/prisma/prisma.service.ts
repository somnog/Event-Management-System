import { Global, Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';


@Global()
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg(
      {
        connectionString: process.env.DATABASE_URL as string,
      },
      {
        schema: 'auth',
      },
    );
    super({ adapter });
  }
}
