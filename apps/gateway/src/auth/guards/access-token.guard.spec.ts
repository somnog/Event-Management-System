import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard', () => {
  const createContext = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization },
        }),
      }),
    }) as ExecutionContext;

  it('rejects requests without a bearer token', async () => {
    const guard = new AccessTokenGuard({
      verifyAsync: jest.fn(),
    } as any);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      new UnauthorizedException('Bearer access token is required'),
    );
  });

  it('accepts a valid access token and attaches the user payload', async () => {
    const payload = {
      sub: 'user-id',
      email: 'user@example.com',
      type: 'access' as const,
    };
    const verifyAsync = jest.fn().mockResolvedValue(payload);
    const request = { headers: { authorization: 'Bearer valid-token' } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
    const guard = new AccessTokenGuard({ verifyAsync } as any);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
    expect(verifyAsync).toHaveBeenCalledWith('valid-token');
  });
});
