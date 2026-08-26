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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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


@ApiTags('Usuarios')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuario creado exitosamente')
  @ApiOperation({ summary: 'Crea un nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Los datos enviados no son válidos',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuarios encontrados exitosamente')
  @ApiOperation({ summary: 'Lista los usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Usuarios encontrados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
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
  @ApiOperation({ summary: 'Busca un usuario por su id' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Un SELLER intenta acceder a un usuario que no es el propio',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un usuario con ese id',
  })
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
  @ApiOperation({ summary: 'Actualiza los datos de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Los datos enviados no son válidos',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un usuario con ese id',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /**
   * Endpoint mixto: ADMIN puede cambiar la contraseña de cualquiera,
   * SELLER solo la propia.
   */
  @Patch(':id/password')
  @ResponseMessage('Contraseña actualizada exitosamente')
  @ApiOperation({ summary: 'Actualiza la contraseña de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Los datos enviados no son válidos',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Un SELLER intenta cambiar la contraseña de otro usuario',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un usuario con ese id',
  })
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
  @ApiOperation({ summary: 'Desactiva un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario desactivado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un usuario con ese id',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Usuario reactivado exitosamente')
  @ApiOperation({ summary: 'Reactiva un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario reactivado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un usuario con ese id',
  })
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
