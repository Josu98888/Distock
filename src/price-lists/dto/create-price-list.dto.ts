import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { PriceListItemInputDto } from './price-list-item-input.dto';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePriceListDto {
  /**
   * Nombre de la lista de precios.
   * @example "Lista Mayorista 2026"
   */
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @Transform(trim)
  name!: string;

  /**
   * Estado de la lista. Opcional: si no se envía, Prisma aplica el `@default` del schema.
   * @example true
   */
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive?: boolean;

  /**
   * Permite poblar la lista desde el momento de la creación
   * (ej: al duplicar una lista existente o cargarla desde un Excel).
   * Si no viene, la lista se crea vacía.
   * @example [{ "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "price": "199.99" }]
   */
  @IsOptional()
  @IsArray({ message: 'items debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => PriceListItemInputDto)
  items?: PriceListItemInputDto[];
}
