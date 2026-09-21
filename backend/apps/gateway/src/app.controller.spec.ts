import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should expose a health check', async () => {
      const health = await appController.getHealth();

      expect(health).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          services: expect.objectContaining({
            rabbitmq: expect.objectContaining({ status: expect.any(String) }),
            postgres: expect.objectContaining({ status: expect.any(String) }),
          }),
        }),
      );
    });
  });

  it('keeps the root route available', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });
});
