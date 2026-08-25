import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Patrón para cantidades de stock Decimal(12, 3):
 * Acepta enteros o números con 1 a 3 decimales usando el punto como separador.
 * Rechaza negativos o letras.
 */
const QUANTITY_PATTERN = /^\d{1,9}(\.\d{1,3})?$/;

const toQuantityString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return value;
};

/**
 * Ajusta `quantityAvailable` a un valor absoluto (no es un delta).
 * El servicio valida que no supere `quantityReceived` del lote.
 */
export class AdjustBatchStockDto {
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsString({
    message: 'La cantidad debe ser texto después de la transformación',
  })
  @Matches(QUANTITY_PATTERN, {
    message:
      'La cantidad debe ser un número positivo con hasta 3 decimales separados por punto',
  })
  @Transform(toQuantityString)
  quantity!: string;
}
