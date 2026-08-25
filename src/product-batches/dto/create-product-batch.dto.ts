import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Patrón para cantidades de stock Decimal(12, 3):
 * Acepta enteros o números con 1 a 3 decimales usando el punto como separador.
 * Rechaza negativos o letras.
 */
const QUANTITY_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;

const trimUpper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const toQuantityString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return value;
};

export class CreateProductBatchDto {
  @IsNotEmpty({ message: 'El producto es requerido' })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  productId!: string;

  @IsNotEmpty({ message: 'El número de lote es requerido' })
  @IsString({ message: 'El número de lote debe ser una cadena de texto' })
  @MaxLength(50, {
    message: 'El número de lote no puede superar los 50 caracteres',
  })
  @Transform(trimUpper)
  batchNumber!: string;

  @IsNotEmpty({ message: 'La fecha de vencimiento es requerida' })
  @IsDateString(
    {},
    { message: 'La fecha de vencimiento debe ser una fecha válida (ISO 8601)' },
  )
  expirationDate!: string;

  /**
   * `quantityAvailable` no se pide en el alta: arranca igual a
   * `quantityReceived` y se maneja por separado con las asignaciones
   * (allocations) al despachar pedidos.
   */
  @IsNotEmpty({ message: 'La cantidad recibida es requerida' })
  @IsString({
    message: 'La cantidad recibida debe ser texto después de la transformación',
  })
  @Matches(QUANTITY_PATTERN, {
    message:
      'La cantidad recibida debe ser un número positivo con hasta 3 decimales separados por punto',
  })
  @Transform(toQuantityString)
  quantityReceived!: string;
}
