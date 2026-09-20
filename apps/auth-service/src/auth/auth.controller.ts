import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RegisterDto } from './dto/register-dto';
import { LoginDto } from './dto/dto.login';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @MessagePattern('auth.create')
  async create(@Payload() data: RegisterDto) {
    return this.authService.create(data);
}
@MessagePattern('auth.find_all')
  async findAll() {
    return this.authService.findAll();
  }

@MessagePattern('auth.login')
async login(@Payload() data: LoginDto) {
    console.log('Login DTO:', data);
    return this.authService.login(data);
}

@MessagePattern('auth.refresh')
async refresh(@Payload() data: RefreshTokenDto) {
  return this.authService.refresh(data);
}

@MessagePattern('auth.logout')
async logout(@Payload() data: LogoutDto) {
  return this.authService.logout(data);
}

}

