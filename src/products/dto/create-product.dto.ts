import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Patrón para precisión financiera Decimal(12, 2):
 * Acepta enteros o números con 1 o 2 decimales usando el punto como separador.
 * Rechaza negativos o letras.
 */
const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimUpper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const toMoneyString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return value;
};

export class CreateProductDto {
  @IsNotEmpty({ message: 'El SKU es requerido' })
  @IsString({ message: 'El SKU debe ser una cadena de texto' })
  @MinLength(3, { message: 'El SKU debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El SKU no puede superar los 50 caracteres' })
  @Transform(trimUpper)
  sku!: string;

  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(150, { message: 'El nombre no puede superar los 150 caracteres' })
  @Transform(trim)
  name!: string;

  @IsNotEmpty({ message: 'La unidad es requerida' })
  @IsString({ message: 'La unidad debe ser una cadena de texto' })
  @MaxLength(20, { message: 'La unidad no puede superar los 20 caracteres' })
  @Transform(trimUpper)
  unit!: string;

  @IsNotEmpty({ message: 'El precio de costo es requerido' })
  @IsString({
    message: 'El precio de costo debe ser texto después de la transformación',
  })
  @Matches(MONEY_PATTERN, {
    message:
      'El precio de costo debe ser un número positivo con hasta 2 decimales separados por punto',
  })
  @Transform(toMoneyString)
  costPrice!: string;

  @IsNotEmpty({ message: 'El precio base es requerido' })
  @IsString({
    message: 'El precio base debe ser texto después de la transformación',
  })
  @Matches(MONEY_PATTERN, {
    message:
      'El precio base debe ser un número positivo con hasta 2 decimales separados por punto',
  })
  @Transform(toMoneyString)
  basePrice!: string;
}
