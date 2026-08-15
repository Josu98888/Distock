import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login-user.dto';
import { UserResponseDto } from '@/users/dto/response-user.dto';
import { UserRole } from '../generated/prisma/client';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Inicia sesión un usuario y devuelve los tokens de acceso y refresco junto con la información del usuario.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Credenciales inválidas');

    const tokens = await this.generarTokens(user.id, user.email, user.role);

    return {
      ...tokens,
      user: new UserResponseDto(user),
    };
  }

  /**
   * Refresca los tokens de acceso y refresco de un usuario valido.
   */
  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findByIdWithRefreshToken(userId);

    if (!user || !user.isActive || !user.hashedRefreshToken) {
      throw new ForbiddenException('Acceso denegado');
    }

    const refreshTokenMatches = await bcrypt.compare(
      this.resumir(refreshToken),
      user.hashedRefreshToken,
    );

    if (!refreshTokenMatches) {
      await this.usersService.updateRefreshToken(userId, null);
      throw new ForbiddenException('Acceso denegado');
    }

    return this.generarTokens(user.id, user.email, user.role);
  }

  /**
   * Invalida el refresh token del usuario.
   */
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  /**
   * Firma el par de tokens y guarda el hash del refresh en la base.
   */
  private async generarTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),

      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as JwtSignOptions['expiresIn'],
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(
      this.resumir(refreshToken),
      this.SALT_ROUNDS,
    );

    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Resumir el token para evitar el límite de 72 bytes.
   */
  private resumir(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
