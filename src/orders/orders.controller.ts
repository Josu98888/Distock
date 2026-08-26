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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Pedido creado exitosamente')
  create(
    @CurrentUser('sub') sellerId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(sellerId, createOrderDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Pedidos encontrados exitosamente')
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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrderById(id);
  }

  /** Logística inversa: depósito confirma/despacha/entrega o cancela. */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Estado del pedido actualizado exitosamente')
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
