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
  @IsNotEmpty({ message: 'El productId es requerido' })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  productId!: string;

  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'La cantidad debe ser un número con hasta 3 decimales' },
  )
  @IsPositive({ message: 'La cantidad debe ser un número positivo' })
  quantity!: number;
}

export class CreateOrderDto {
  @IsNotEmpty({ message: 'El customerId es requerido' })
  @IsUUID('4', { message: 'El customerId debe ser un UUID válido' })
  customerId!: string;

  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'El pedido debe tener al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
