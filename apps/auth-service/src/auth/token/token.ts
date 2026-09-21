import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  /**
   * Unique per issued token. Without it, two tokens minted for the same
   * user in the same second are byte-identical, and storing the second
   * one violates the unique index on refresh_tokens.tokenHash.
   */
  jti: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
  }

  async generateRefreshToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });
  }

  async generateAuthTokens(user: {
    id: string;
    email: string;
    role: string;
  }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        token,
      );

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid access token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired access token',
      );
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        token,
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }
  }

  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }
}