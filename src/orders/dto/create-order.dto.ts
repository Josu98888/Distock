import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Entrada mínima por línea de pedido: producto + cantidad.
 * REGLA CRÍTICA: no se aceptan precios, costos ni lotes (BatchAllocation) desde el cliente,
 * eso lo calcula el service (precio según PriceList, FEFO sobre ProductBatch).
 */
export class CreateOrderItemDto {
  /**
   * Identificador (UUID) del producto solicitado.
   * @example "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   */
  @IsNotEmpty({ message: 'El productId es requerido' })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  productId!: string;

  /**
   * Cantidad solicitada del producto, hasta 3 decimales.
   * @example 5.5
   */
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'La cantidad debe ser un número con hasta 3 decimales' },
  )
  @IsPositive({ message: 'La cantidad debe ser un número positivo' })
  quantity!: number;
}

export class CreateOrderDto {
  /**
   * Identificador (UUID) del cliente que realiza el pedido.
   * @example "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   */
  @IsNotEmpty({ message: 'El customerId es requerido' })
  @IsUUID('4', { message: 'El customerId debe ser un UUID válido' })
  customerId!: string;

  /**
   * Líneas del pedido, al menos un item.
   * @example [{ "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "quantity": 5.5 }]
   */
  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'El pedido debe tener al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
