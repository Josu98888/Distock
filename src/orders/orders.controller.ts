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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Pedidos')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Pedido creado exitosamente')
  @ApiOperation({ summary: 'Crea un nuevo pedido' })
  @ApiResponse({
    status: 201,
    description: 'Pedido creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Los datos enviados no son válidos o no hay stock suficiente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  create(
    @CurrentUser('sub') sellerId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(sellerId, createOrderDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Pedidos encontrados exitosamente')
  @ApiOperation({ summary: 'Lista los pedidos' })
  @ApiResponse({
    status: 200,
    description: 'Pedidos encontrados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('sellerId') sellerId?: string,
  ) {
    const effectiveSellerId =
      currentUser.role === UserRole.ADMIN ? sellerId : currentUser.sub;

    return this.ordersService.findAllOrders(effectiveSellerId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Pedido encontrado exitosamente')
  @ApiOperation({ summary: 'Busca un pedido por su id' })
  @ApiResponse({
    status: 200,
    description: 'Pedido encontrado exitosamente',
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
    description: 'No existe un pedido con ese id',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrderById(id);
  }

  /** Logística inversa: depósito confirma/despacha/entrega o cancela. */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Estado del pedido actualizado exitosamente')
  @ApiOperation({ summary: 'Actualiza el estado logístico de un pedido' })
  @ApiResponse({
    status: 200,
    description: 'Estado del pedido actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'El campo status es requerido o la transición no es válida',
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
    description: 'No existe un pedido con ese id',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    if (!dto.status) {
      throw new BadRequestException('El campo status es requerido');
    }

    return this.ordersService.updateOrderStatus(id, dto.status);
  }

  /** Tesorería: marca el pedido como pagado o parcialmente pagado. */
  @Patch(':id/payment-status')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Estado de pago del pedido actualizado exitosamente')
  @ApiOperation({ summary: 'Actualiza el estado de pago de un pedido' })
  @ApiResponse({
    status: 200,
    description: 'Estado de pago del pedido actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'El campo paymentStatus es requerido o no es válido',
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
    description: 'No existe un pedido con ese id',
  })
  updatePaymentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    if (!dto.paymentStatus) {
      throw new BadRequestException('El campo paymentStatus es requerido');
    }

    return this.ordersService.updatePaymentStatus(id, dto.paymentStatus);
  }
}
