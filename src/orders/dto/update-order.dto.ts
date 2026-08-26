import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../../generated/prisma/client';

/**
 * DTO de transición de estados, no de edición del pedido.
 * No permite tocar customerId, items, precios ni totales:
 * eso se define una sola vez al crear el pedido.
 */
export class UpdateOrderDto {
  /** Depósito/logística: CONFIRMED, DISPATCHED, DELIVERED (o CANCELLED). */
  @IsOptional()
  @IsEnum(OrderStatus, {
    message:
      'El status debe ser uno de: PENDING, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED',
  })
  status?: OrderStatus;

  /** Tesorería: PAID o PARTIALLY_PAID. */
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: 'El paymentStatus debe ser uno de: PENDING, PAID, PARTIALLY_PAID',
  })
  paymentStatus?: PaymentStatus;
}
