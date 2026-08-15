import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-user.dto';
import { Public } from './decorators/public.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RawRefreshToken } from './decorators/refresh-token.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Inicio de sesión exitoso')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens renovados exitosamente')
  refresh(
    @CurrentUser('sub') userId: string,
    @RawRefreshToken() rawRefreshToken: string,
  ) {
    return this.authService.refresh(userId, rawRefreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Sesión cerrada exitosamente')
  logout(@CurrentUser('sub') userId: string) {
    return this.authService.logout(userId);
  }
}
