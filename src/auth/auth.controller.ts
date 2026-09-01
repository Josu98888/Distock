import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-user.dto';
import { Public } from './decorators/public.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { SkipResponseTransform } from '@/common/decorators/skip-response-transform.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RawRefreshToken } from './decorators/refresh-token.decorator';
import { seconds, Throttle } from '@nestjs/throttler';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ short: { limit: 5, ttl: seconds(60) } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Inicio de sesión exitoso')
  @ApiOperation({ summary: 'Inicia sesión con email y contraseña' })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso, devuelve los tokens y el usuario',
  })
  @ApiResponse({
    status: 400,
    description: 'Los datos enviados no son válidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o usuario inactivo',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: seconds(60) } })
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens renovados exitosamente')
  @ApiOperation({ summary: 'Renueva el par de tokens usando el refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token ausente, inválido o expirado',
  })
  refresh(
    @CurrentUser('sub') userId: string,
    @RawRefreshToken() rawRefreshToken: string,
  ) {
    return this.authService.refresh(userId, rawRefreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Un 204 no debería llevar body, así que se salta el envoltorio del
  // TransformInterceptor en vez de dejar que le agregue uno igual.
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Cierra la sesión del usuario autenticado' })
  @ApiResponse({
    status: 204,
    description: 'Sesión cerrada exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  logout(@CurrentUser('sub') userId: string) {
    return this.authService.logout(userId);
  }
}
