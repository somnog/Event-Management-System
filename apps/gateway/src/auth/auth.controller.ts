import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './guards/roles.decorator';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, throwError, timeout } from 'rxjs';
import { RegisterDto } from './dto/register-dto';
import { LoginDto } from './dto/login-dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
// import { CreateCategoryDto } from 'src/event/dto/create-event.dto';

function mapAuthError(error: any) {
  // The RMQ client rejects with the RpcException payload itself
  // ({ statusCode, message, error }). Unwrapping `message` first landed on
  // the message string and lost the status, making every auth failure a 500.
  const response =
    error && typeof error === 'object' && 'statusCode' in error
      ? error
      : (error?.message ?? error);
  const statusCode = Number(response?.statusCode);
  const status = Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
    ? statusCode
    : 500;
  const message = response?.message ?? response ?? 'Internal server error';

  return new HttpException(message, status);
}

@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientProxy) {}

  private registerUser(dto: RegisterDto) {
    return this.client
      .send('auth.create', dto)
      .pipe(timeout(5000), catchError((error) => throwError(() => mapAuthError(error))));
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerUser(dto);
  }

@Post('login')
  login(@Body() dto: LoginDto) {

    return this.client
      .send('auth.login', dto)
      .pipe(timeout(5000), catchError((error) => throwError(() => mapAuthError(error))));
  }

@Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.client
      .send('auth.refresh', dto)
      .pipe(timeout(5000), catchError((error) => throwError(() => mapAuthError(error))));
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.client
      .send('auth.logout', dto)
      .pipe(timeout(5000), catchError((error) => throwError(() => mapAuthError(error))));
  }

// Returns every user, so it is admin-only.
@Get()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('admin')
findAll() {
    return this.client
      .send('auth.find_all', {})
      .pipe(timeout(5000), catchError((error) => throwError(() => mapAuthError(error))));
  }


//   @Post('login')
//   login(@Body() dto: RegisterDto) {
//     return this.client.send('auth.login', dto).pipe(timeout(5000));
//   }

//   @Post('refresh')
//   refresh(@Body() dto: RefreshTokenDto) {
//     return this.client.send('auth.refresh', dto).pipe(timeout(5000));
//   }
// }

//     return this.client.send('category.create', dto).pipe(timeout(5000));
//   }

//   @Get()
//   findAll() {
//     return this.client.send('category.find_all', {}).pipe(timeout(5000));
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.client.send('category.find_one', { id }).pipe(timeout(5000));
//   }
}
