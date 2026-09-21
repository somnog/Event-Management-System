import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token/token';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const buildPrismaMock = () => {
  const transaction = {
    refreshToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({}),
    },
  };

  return {
    transaction,
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
};

const buildTokenServiceMock = () => ({
  generateAuthTokens: jest.fn().mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  }),
  verifyRefreshToken: jest.fn(),
});

const activeUser = {
  id: 'user-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  affiliation: 'Somnog',
  country: 'SO',
  phone: '+252600000000',
  role: 'ATTENDEE',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

type PrismaMock = ReturnType<typeof buildPrismaMock>;

// Reads the data argument handed to the nth auditLog.create call.
const auditCall = (prisma: PrismaMock, index = 0) =>
  prisma.auditLog.create.mock.calls[index][0].data;

// Asserts the promise rejects with an RpcException carrying the given status.
const expectRpcStatus = async (
  promise: Promise<unknown>,
  statusCode: number,
) => {
  await expect(promise).rejects.toBeInstanceOf(RpcException);
  await promise.catch((error: RpcException) => {
    expect((error.getError() as { statusCode: number }).statusCode).toBe(
      statusCode,
    );
  });
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let tokenService: ReturnType<typeof buildTokenServiceMock>;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct-horse', 10);
  });

  beforeEach(async () => {
    prisma = buildPrismaMock();
    tokenService = buildTokenServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const registerDto = {
      email: activeUser.email,
      password: 'correct-horse',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    it('rejects a duplicate email with 400 and audits the failure', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-1' });

      await expectRpcStatus(service.create(registerDto), 400);

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(auditCall(prisma)).toMatchObject({
        userId: 'existing-1',
        action: 'REGISTER_FAILED',
      });
    });

    it('stores a bcrypt hash rather than the plaintext password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...activeUser });

      await service.create(registerDto);

      const stored = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(stored).not.toBe(registerDto.password);
      await expect(bcrypt.compare(registerDto.password, stored)).resolves.toBe(
        true,
      );
    });

    it('accepts the deprecated passwordHash alias and still hashes it', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...activeUser });

      const { password, ...withoutPassword } = registerDto;
      await service.create({ ...withoutPassword, passwordHash: password });

      const stored = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(stored).not.toBe(password);
      await expect(bcrypt.compare(password, stored)).resolves.toBe(true);
    });

    it('prefers password over the deprecated alias when both are sent', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...activeUser });

      await service.create({ ...registerDto, passwordHash: 'the-alias-value' });

      const stored = prisma.user.create.mock.calls[0][0].data.passwordHash;
      await expect(bcrypt.compare('correct-horse', stored)).resolves.toBe(true);
      await expect(bcrypt.compare('the-alias-value', stored)).resolves.toBe(
        false,
      );
    });

    it('rejects a payload carrying neither password nor the alias', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const { password, ...withoutPassword } = registerDto;
      await expectRpcStatus(
        service.create(withoutPassword as typeof registerDto),
        400,
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('never returns the password hash to the caller', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...activeUser });

      const result = await service.create(registerDto);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({
        id: activeUser.id,
        email: activeUser.email,
      });
      expect(auditCall(prisma)).toMatchObject({ action: 'REGISTER' });
    });
  });

  describe('login', () => {
    const loginDto = { email: activeUser.email, password: 'correct-horse' };

    it('returns 401 for an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectRpcStatus(service.login(loginDto), 401);

      expect(auditCall(prisma)).toMatchObject({ action: 'LOGIN_FAILED' });
    });

    it('returns 401 for a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      await expectRpcStatus(
        service.login({ ...loginDto, password: 'wrong-password' }),
        401,
      );

      expect(tokenService.generateAuthTokens).not.toHaveBeenCalled();
    });

    it('returns 403 for a deactivated account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        passwordHash,
        isActive: false,
      });

      await expectRpcStatus(service.login(loginDto), 403);

      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('issues tokens and persists only the refresh token hash', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      const result = await service.login(loginDto);

      expect(result.tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(result.user).not.toHaveProperty('passwordHash');

      const persisted = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(persisted.tokenHash).toBe(sha256('refresh-token'));
      expect(persisted.userId).toBe(activeUser.id);
      expect(persisted.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('stamps lastLoginAt on success', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      await service.login(loginDto);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: activeUser.id } }),
      );
      expect(
        prisma.user.update.mock.calls[0][0].data.lastLoginAt,
      ).toBeInstanceOf(Date);
    });
  });

  describe('refresh', () => {
    const refreshDto = { refreshToken: 'refresh-token' };

    const storedToken = (overrides: Record<string, unknown> = {}) => ({
      id: 'token-1',
      userId: activeUser.id,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: { ...activeUser },
      ...overrides,
    });

    it('returns 401 when the JWT itself does not verify', async () => {
      tokenService.verifyRefreshToken.mockRejectedValue(new Error('bad token'));

      await expectRpcStatus(service.refresh(refreshDto), 401);

      expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is no longer in the store', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: activeUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expectRpcStatus(service.refresh(refreshDto), 401);
    });

    it('returns 401 when the stored token has expired', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: activeUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 60_000) }),
      );

      await expectRpcStatus(service.refresh(refreshDto), 401);
    });

    it('returns 403 when the owner has been deactivated', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: activeUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue(
        storedToken({ user: { ...activeUser, isActive: false } }),
      );

      await expectRpcStatus(service.refresh(refreshDto), 403);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('looks the token up by hash scoped to the JWT subject', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: activeUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken());

      await service.refresh(refreshDto);

      expect(
        prisma.refreshToken.findFirst.mock.calls[0][0].where,
      ).toMatchObject({
        tokenHash: sha256('refresh-token'),
        userId: activeUser.id,
        revokedAt: null,
      });
    });

    it('rotates the token: revokes the old one and stores the new one', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: activeUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken());
      tokenService.generateAuthTokens.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await service.refresh(refreshDto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(
        prisma.transaction.refreshToken.updateMany.mock.calls[0][0].where,
      ).toMatchObject({ id: 'token-1', revokedAt: null });
      expect(
        prisma.transaction.refreshToken.create.mock.calls[0][0].data.tokenHash,
      ).toBe(sha256('new-refresh'));
      expect(result.tokens.refreshToken).toBe('new-refresh');
    });

    it('fails the rotation when the old token was revoked concurrently', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({ sub: activeUser.id });
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken());
      prisma.transaction.refreshToken.updateMany.mockResolvedValue({
        count: 0,
      });

      await expectRpcStatus(service.refresh(refreshDto), 401);

      expect(prisma.transaction.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('never selects passwordHash', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll();

      const select = prisma.user.findMany.mock.calls[0][0].select;
      expect(select).toBeDefined();
      expect(select.passwordHash).toBeUndefined();
      expect(select).toMatchObject({ id: true, email: true, role: true });
    });
  });

  describe('logout', () => {
    it('revokes the matching token and audits the owner', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        userId: activeUser.id,
      });

      const result = await service.logout({ refreshToken: 'refresh-token' });

      expect(
        prisma.refreshToken.updateMany.mock.calls[0][0].where,
      ).toMatchObject({
        tokenHash: sha256('refresh-token'),
        revokedAt: null,
      });
      expect(auditCall(prisma)).toMatchObject({
        userId: activeUser.id,
        action: 'LOGOUT',
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('stays idempotent for an unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.logout({ refreshToken: 'never-issued' }),
      ).resolves.toEqual({ message: 'Logged out successfully' });

      expect(auditCall(prisma)).toMatchObject({ userId: undefined });
    });
  });
});
