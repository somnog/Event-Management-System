import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    create: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    findAll: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      login: jest.fn().mockResolvedValue({ tokens: {} }),
      refresh: jest.fn().mockResolvedValue({ tokens: {} }),
      logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
      findAll: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards auth.create payloads to the service', async () => {
    const dto = {
      email: 'ada@example.com',
      password: 'correct-horse',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    await expect(controller.create(dto)).resolves.toEqual({ id: 'user-1' });
    expect(authService.create).toHaveBeenCalledWith(dto);
  });

  it('forwards auth.login payloads to the service', async () => {
    const dto = { email: 'ada@example.com', password: 'correct-horse' };

    await controller.login(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('forwards auth.refresh payloads to the service', async () => {
    const dto = { refreshToken: 'refresh-token' };

    await controller.refresh(dto);

    expect(authService.refresh).toHaveBeenCalledWith(dto);
  });

  it('forwards auth.logout payloads to the service', async () => {
    const dto = { refreshToken: 'refresh-token' };

    await controller.logout(dto);

    expect(authService.logout).toHaveBeenCalledWith(dto);
  });

  it('forwards auth.find_all to the service', async () => {
    await expect(controller.findAll()).resolves.toEqual([]);
    expect(authService.findAll).toHaveBeenCalled();
  });
});
