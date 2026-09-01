import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Solo modifica los datos de cabecera de la lista.
 * Para tocar los precios se usa SyncPriceItemsDto.
 */
export class UpdatePriceListDto {
  /**
   * Nombre de la lista de precios.
   * @example "Lista Mayorista 2026"
   */
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @Transform(trim)
  name?: string;

  /**
   * Estado de la lista.
   * @example true
   */
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive?: boolean;
}
