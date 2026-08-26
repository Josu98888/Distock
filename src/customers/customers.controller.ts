import {
  Post,
  Body,
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Clientes')
@Controller('customers')
@UseGuards(RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente creado exitosamente')
  @ApiOperation({ summary: 'Crea un nuevo cliente' })
  @ApiResponse({
    status: 201,
    description: 'Cliente creado exitosamente',
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
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Clientes encontrados exitosamente')
  @ApiOperation({ summary: 'Lista los clientes' })
  @ApiResponse({
    status: 200,
    description: 'Clientes encontrados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.customersService.findAll(includeInactive === 'true');
  }

  /**
   * Va declarada antes que :id para dejar explícito que 'cuit' es un
   * segmento literal y no un id: el CUIT no es UUID y no lleva ParseUUIDPipe.
   */
  @Get('cuit/:cuit')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Cliente encontrado exitosamente')
  @ApiOperation({ summary: 'Busca un cliente por su CUIT' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un cliente con ese CUIT',
  })
  findByCuit(@Param('cuit') cuit: string) {
    return this.customersService.findByCuit(cuit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Cliente encontrado exitosamente')
  @ApiOperation({ summary: 'Busca un cliente por su id' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un cliente con ese id',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente actualizado exitosamente')
  @ApiOperation({ summary: 'Actualiza los datos de un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado exitosamente',
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
    description: 'No existe un cliente con ese id',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente desactivado exitosamente')
  @ApiOperation({ summary: 'Desactiva un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente desactivado exitosamente',
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
    description: 'No existe un cliente con ese id',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente reactivado exitosamente')
  @ApiOperation({ summary: 'Reactiva un cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente reactivado exitosamente',
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
    description: 'No existe un cliente con ese id',
  })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.reactivate(id);
  }
}
