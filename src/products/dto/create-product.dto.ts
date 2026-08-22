import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Los importes se reciben y validan como string para no perder precisión:
 * el schema los define como Decimal(12, 2) y el PRD prohíbe tratar dinero
 * como Float/number. El service los convierte a Prisma.Decimal.
 */
const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

const trimUpper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : (value as unknown);

/**
 * Acepta number por comodidad del cliente, pero lo normaliza a string
 * antes de validar, para que la validación corra siempre sobre texto exacto.
 */
const toMoneyString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return value as unknown;
};

export class CreateProductDto {
  @IsString({ message: 'El SKU debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El SKU es requerido' })
  @MinLength(3, { message: 'El SKU debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El SKU no puede superar los 50 caracteres' })
  @Transform(trimUpper)
  sku!: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(150, { message: 'El nombre no puede superar los 150 caracteres' })
  @Transform(trim)
  name!: string;

  @IsString({ message: 'La unidad debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La unidad es requerida' })
  @MaxLength(20, { message: 'La unidad no puede superar los 20 caracteres' })
  @Transform(trimUpper)
  unit!: string;

  @IsNotEmpty({ message: 'El precio de costo es requerido' })
  @Matches(MONEY_PATTERN, {
    message:
      'El precio de costo debe ser un número positivo con hasta 2 decimales',
  })
  @Transform(toMoneyString)
  costPrice!: string;

  @IsNotEmpty({ message: 'El precio base es requerido' })
  @Matches(MONEY_PATTERN, {
    message: 'El precio base debe ser un número positivo con hasta 2 decimales',
  })
  @Transform(toMoneyString)
  basePrice!: string;
}
