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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customers')
@UseGuards(RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente creado exitosamente')
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Clientes encontrados exitosamente')
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
  findByCuit(@Param('cuit') cuit: string) {
    return this.customersService.findByCuit(cuit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Cliente encontrado exitosamente')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente actualizado exitosamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente desactivado exitosamente')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Cliente reactivado exitosamente')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.reactivate(id);
  }
}
