import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register-dto';
import { LoginDto } from './dto/dto.login';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import * as bcrypt from 'bcrypt';
import { TokenService } from './token/token';
import { RpcException } from '@nestjs/microservices';
import { createHash } from 'node:crypto';

@Injectable()
export class AuthService {
    constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService
    ) {}
    
    // constructor (private readonly tokenService: TokenService) {}
    private readonly saltRounds = 10; 

    async create(data: RegisterDto) {
        // Check if the email already exists
    const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existingUser) {
        await this.writeAuditLog({
          userId: existingUser.id,
          action: 'REGISTER_FAILED',
          details: { reason: 'email_exists' },
        });
        throw new RpcException({
            statusCode: 400,
            message: 'Email already exists',
            error: `A user with email ${data.email} already exists`,
        });
    }

    // `passwordHash` is the deprecated alias for `password`; both carry the
    // plaintext password. The DTO guarantees one of them is present.
    const plainPassword = data.password ?? data.passwordHash;

    if (!plainPassword) {
      throw new RpcException({
        statusCode: 400,
        message: 'password is required',
        error: 'Bad Request',
      });
    }

    // Create a new user
    const newUser = await this.prisma.user.create({
        data: {
            email: data.email,
            passwordHash: await this.hashPassword(plainPassword),
            firstName: data.firstName,
            lastName: data.lastName,
            affiliation: data.affiliation,
            country: data.country,
            phone: data.phone,
        },
    });

    await this.writeAuditLog({
      userId: newUser.id,
      action: 'REGISTER',
      details: { email: newUser.email },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      affiliation: newUser.affiliation,
      country: newUser.country,
      phone: newUser.phone,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
}
// Login
// async login(data: LoginDto) {
//   const user = await this.prisma.user.findUnique({
//     where: { email: data.email },
//   });

//   if (!user) {
//     throw new RpcException({
//       statusCode: 401,
//       message: 'Invalid email or password',
//       error: 'Unauthorized',
//     });
//   }

//   // Compare the plain password with the stored hash
//   const isPasswordValid = await this.comparePasswords(
//     data.password,
//     user.passwordHash,
//   );

//   if (!isPasswordValid) {
//     throw new RpcException({
//       statusCode: 401,
//       message: 'Invalid email or password',
//       error: 'Unauthorized',
//     });
//   }

//   const tokens = await this.tokenService.generateAuthTokens({
//     id: user.id,
//     email: user.email,
//   });

//   return {
//     user: {
//       id: user.id,
//       email: user.email,
//       firstName: user.firstName,
//       lastName: user.lastName,
//     },
//     tokens,
//   };
// }
async login(data: LoginDto) {
  const user = await this.prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    await this.writeAuditLog({
      action: 'LOGIN_FAILED',
      details: { email: data.email, reason: 'user_not_found' },
    });
    throw new RpcException({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
  }

  const isPasswordValid = await this.comparePasswords(
    data.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    await this.writeAuditLog({
      userId: user.id,
      action: 'LOGIN_FAILED',
      details: { reason: 'invalid_password' },
    });
    throw new RpcException({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
  }

  if (!user.isActive) {
    await this.writeAuditLog({
      userId: user.id,
      action: 'LOGIN_FAILED',
      details: { reason: 'inactive_account' },
    });
    throw new RpcException({
      statusCode: 403,
      message: 'Account is inactive',
      error: 'Forbidden',
    });
  }

  const tokens = await this.tokenService.generateAuthTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  await this.prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: this.hashRefreshToken(tokens.refreshToken),
      expiresAt,
    },
  });

  await this.prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  await this.writeAuditLog({
    userId: user.id,
    action: 'LOGIN',
    details: { role: user.role },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    tokens,
  };
}

async refresh(data: RefreshTokenDto) {
  let payload;

  try {
    payload = await this.tokenService.verifyRefreshToken(data.refreshToken);
  } catch {
    await this.writeAuditLog({
      action: 'REFRESH_FAILED',
      details: { reason: 'invalid_or_expired_token' },
    });
    throw new RpcException({
      statusCode: 401,
      message: 'Invalid or expired refresh token',
      error: 'Unauthorized',
    });
  }

  const tokenHash = this.hashRefreshToken(data.refreshToken);

  const storedToken = await this.prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId: payload.sub,
      revokedAt: null,
    },
    include: {
      user: true,
    },
  });

  if (!storedToken || storedToken.expiresAt <= new Date()) {
    await this.writeAuditLog({
      userId: storedToken?.userId,
      action: 'REFRESH_FAILED',
      details: { reason: 'revoked_or_expired_token' },
    });
    throw new RpcException({
      statusCode: 401,
      message: 'Invalid or expired refresh token',
      error: 'Unauthorized',
    });
  }

  if (!storedToken.user.isActive) {
    await this.writeAuditLog({
      userId: storedToken.user.id,
      action: 'REFRESH_FAILED',
      details: { reason: 'inactive_account' },
    });
    throw new RpcException({
      statusCode: 403,
      message: 'Account is inactive',
      error: 'Forbidden',
    });
  }

  const tokens = await this.tokenService.generateAuthTokens({
    id: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await this.prisma.$transaction(async (transaction) => {
    const revoked = await transaction.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (revoked.count !== 1) {
      throw new RpcException({
        statusCode: 401,
        message: 'Invalid or expired refresh token',
        error: 'Unauthorized',
      });
    }

    await transaction.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: this.hashRefreshToken(tokens.refreshToken),
        expiresAt,
      },
    });
  });

  await this.writeAuditLog({
    userId: storedToken.user.id,
    action: 'REFRESH_TOKEN',
  });

  return {
    user: {
      id: storedToken.user.id,
      email: storedToken.user.email,
      firstName: storedToken.user.firstName,
      lastName: storedToken.user.lastName,
      role: storedToken.user.role,
    },
    tokens,
  };
}

async logout(data: LogoutDto) {
  const tokenHash = this.hashRefreshToken(data.refreshToken);
  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });

  await this.prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await this.writeAuditLog({
    userId: storedToken?.userId,
    action: 'LOGOUT',
  });

  return {
    message: 'Logged out successfully',
  };
}

private async writeAuditLog(input: {
  userId?: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  await this.prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      service: 'auth-service',
      details: input.details ? JSON.stringify(input.details) : undefined,
    },
  });
}

// Find All
async findAll() {
    // Explicit select: never leak passwordHash to callers.
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        affiliation: true,
        country: true,
        phone: true,
        role: true,
        emailVerified: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
}

async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
}

async comparePasswords(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

private hashRefreshToken(token: string): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

}
