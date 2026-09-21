import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { createHash } from 'node:crypto';

import { TokenService } from './token';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('TokenService', () => {
  let service: TokenService;

  const user = { id: 'user-1', email: 'ada@example.com', role: 'ATTENDEE' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [TokenService],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  // Regression: JWT `iat`/`exp` are second-granularity, so without a unique
  // `jti` two tokens minted for the same user inside one second are identical.
  // Storing the second then violates the unique index on
  // refresh_tokens.tokenHash and surfaces as a 500 on /auth/refresh.
  it('mints a distinct refresh token on every call within the same second', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 25 }, () => service.generateRefreshToken(user)),
    );

    expect(new Set(tokens).size).toBe(tokens.length);
    expect(new Set(tokens.map(sha256)).size).toBe(tokens.length);
  });

  it('mints a distinct access token on every call within the same second', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 25 }, () => service.generateAccessToken(user)),
    );

    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('gives the access and refresh token of one pair different ids', async () => {
    const { accessToken, refreshToken } = await service.generateAuthTokens(user);

    const access = await service.verifyAccessToken(accessToken);
    const refresh = await service.verifyRefreshToken(refreshToken);

    expect(access.jti).toEqual(expect.any(String));
    expect(refresh.jti).toEqual(expect.any(String));
    expect(access.jti).not.toBe(refresh.jti);
  });

  it('rejects a refresh token presented as an access token', async () => {
    const { refreshToken } = await service.generateAuthTokens(user);

    await expect(service.verifyAccessToken(refreshToken)).rejects.toThrow(
      'Invalid or expired access token',
    );
  });

  it('rejects an access token presented as a refresh token', async () => {
    const { accessToken } = await service.generateAuthTokens(user);

    await expect(service.verifyRefreshToken(accessToken)).rejects.toThrow(
      'Invalid or expired refresh token',
    );
  });
});
