import {
  IsDate,
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

// El frontend manda `expirationDate` como string (ISO 8601). Prisma espera un
// `Date` para columnas DateTime, así que se transforma acá antes de validar
// con @IsDate; si el string es inválido se deja pasar tal cual para que
// @IsDate lo rechace con un mensaje claro en vez de fallar en el ORM.
const toDate = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
};

export class CreateProductBatchDto {
  /**
   * Identificador (UUID) del producto al que pertenece el lote.
   * @example "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   */
  @IsNotEmpty({ message: 'El producto es requerido' })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  productId!: string;

  /**
   * Número identificatorio del lote.
   * @example "LOTE-2026-001"
   */
  @IsNotEmpty({ message: 'El número de lote es requerido' })
  @IsString({ message: 'El número de lote debe ser una cadena de texto' })
  @MaxLength(50, {
    message: 'El número de lote no puede superar los 50 caracteres',
  })
  @Transform(trimUpper)
  batchNumber!: string;

  /**
   * Fecha de vencimiento del lote (ISO 8601). Llega como string desde el
   * frontend y se transforma a `Date` (ver `toDate`) antes de validar.
   * @example "2026-12-31"
   */
  @IsNotEmpty({ message: 'La fecha de vencimiento es requerida' })
  @IsDate({
    message: 'La fecha de vencimiento debe ser una fecha válida (ISO 8601)',
  })
  @Transform(toDate)
  expirationDate!: Date;

  /**
   * Cantidad recibida del lote, hasta 3 decimales. `quantityAvailable` no
   * se pide en el alta: arranca igual a `quantityReceived` y se maneja por
   * separado con las asignaciones (allocations) al despachar pedidos.
   * @example "500.000"
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
