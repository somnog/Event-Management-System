import { Injectable } from '@nestjs/common';
import { Socket } from 'node:net';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    const [rabbitmq, postgres] = await Promise.all([
      this.checkUrl(process.env.RABBITMQ_URL, 5672),
      this.checkUrl(process.env.DATABASE_URL, 5433),
    ]);

    const healthy = rabbitmq.status === 'up' && postgres.status === 'up';

    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        rabbitmq,
        postgres,
      },
    };
  }

  private checkUrl(
    connectionString: string | undefined,
    defaultPort: number,
  ): Promise<{ status: 'up' | 'down'; error?: string }> {
    return new Promise((resolve) => {
      if (!connectionString) {
        resolve({ status: 'down', error: 'not configured' });
        return;
      }

      try {
        const url = new URL(connectionString);
        const socket = new Socket();
        const port = Number(url.port) || defaultPort;

        const finish = (result: { status: 'up' | 'down'; error?: string }) => {
          socket.destroy();
          resolve(result);
        };

        socket.setTimeout(1000);
        socket.once('connect', () => finish({ status: 'up' }));
        socket.once('timeout', () => finish({ status: 'down', error: 'timeout' }));
        socket.once('error', () => finish({ status: 'down', error: 'unreachable' }));
        socket.connect(port, url.hostname);
      } catch {
        resolve({ status: 'down', error: 'invalid configuration' });
      }
    });
  }
}
