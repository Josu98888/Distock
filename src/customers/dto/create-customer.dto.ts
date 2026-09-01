import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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

/** CUIT argentino normalizado: 11 dígitos, sin guiones ni puntos. */
const CUIT_PATTERN = /^\d{11}$/;

/** Teléfono: dígitos, espacios, guiones, paréntesis y prefijo internacional. */
const PHONE_PATTERN = /^\+?[\d\s()-]{6,25}$/;

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimUpper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/** Deja el CUIT solo en dígitos: "30-71234567-8" → "30712345678". */
const toDigits = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.replace(/[\s.-]/g, '') : value;

const toMoneyString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return value;
};

export class CreateCustomerDto {
  /**
   * Razón social del cliente.
   * @example "DISTRIBUIDORA CENTRAL SRL"
   */
  @IsNotEmpty({ message: 'La razón social es requerida' })
  @IsString({ message: 'La razón social debe ser una cadena de texto' })
  @MinLength(3, { message: 'La razón social debe tener al menos 3 caracteres' })
  @MaxLength(150, {
    message: 'La razón social no puede superar los 150 caracteres',
  })
  @Transform(trimUpper)
  businessName!: string;

  /**
   * CUIT del cliente, 11 dígitos (con o sin guiones).
   * @example "30712345678"
   */
  @IsNotEmpty({ message: 'El CUIT es requerido' })
  @IsString({ message: 'El CUIT debe ser una cadena de texto' })
  @Matches(CUIT_PATTERN, {
    message: 'El CUIT debe tener 11 dígitos (con o sin guiones)',
  })
  @Transform(toDigits)
  cuit!: string;

  /**
   * Dirección física del cliente.
   * @example "Av. Siempre Viva 742"
   */
  @IsNotEmpty({ message: 'La dirección es requerida' })
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  @MaxLength(200, {
    message: 'La dirección no puede superar los 200 caracteres',
  })
  @Transform(trim)
  address!: string;

  /**
   * Teléfono de contacto del cliente.
   * @example "+54 11 4444-5555"
   */
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @Matches(PHONE_PATTERN, {
    message: 'El teléfono no tiene un formato válido',
  })
  @Transform(trim)
  phone?: string;

  /**
   * Límite de crédito del cliente. Opcional: si no se envía, Prisma aplica el `@default(0)` del schema.
   * @example "150000.00"
   */
  @IsOptional()
  @IsString({
    message: 'El límite de crédito debe ser texto después de la transformación',
  })
  @Matches(MONEY_PATTERN, {
    message:
      'El límite de crédito debe ser un número positivo con hasta 2 decimales separados por punto',
  })
  @Transform(toMoneyString)
  creditLimit?: string;

  /**
   * Identificador (UUID) de la lista de precios asignada al cliente.
   * @example "3fa85f64-5717-4562-b3fc-2c963f66afa6"
   */
  @IsNotEmpty({ message: 'La lista de precios es requerida' })
  @IsUUID('4', { message: 'La lista de precios debe ser un UUID válido' })
  @Transform(trim)
  priceListId!: string;
}
