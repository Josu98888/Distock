import {
  Post,
  Body,
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';


@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuario creado exitosamente')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuarios encontrados exitosamente')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.usersService.findAll(includeInactive === 'true');
  }

  /**
   * Endpoint mixto: ADMIN puede ver a cualquiera, SELLER solo a sí mismo.
   * No lleva @Roles() porque no es una restricción por rol, sino por
   * "dueño del recurso" — se resuelve acá, no en el guard.
   */
  @Get(':id')
  @ResponseMessage('Usuario encontrado exitosamente')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    this.assertIsAdminOrOwner(currentUser, id);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuario actualizado exitosamente')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /**
   * Endpoint mixto: ADMIN puede cambiar la contraseña de cualquiera,
   * SELLER solo la propia.
   */
  @Patch(':id/password')
  @ResponseMessage('Contraseña actualizada exitosamente')
  updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePasswordDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    this.assertIsAdminOrOwner(currentUser, id);
    return this.usersService.updatePassword(id, dto.password);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuario desactivado exitosamente')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuario reactivado exitosamente')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.reactivate(id);
  }

  /**
   * Un ADMIN pasa siempre. Un SELLER solo si el :id de la ruta
   * coincide con su propio id (currentUser.sub, extraído del JWT,
   * nunca del param en sí, para que no se pueda "mentir" el id propio).
   */
  private assertIsAdminOrOwner(currentUser: JwtPayload, targetId: string) {
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isOwner = currentUser.sub === targetId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'No tenés permiso para acceder a este recurso',
      );
    }
  }
}
