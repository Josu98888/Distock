import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

const toMoneyString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return value; // deja pasar null tal cual
};

export class PriceListItemInputDto {
  @IsNotEmpty({ message: 'El producto es requerido' })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  productId!: string;

  /**
   * Convención: `null` significa "eliminar este producto de la lista"
   * (solo tiene sentido en SyncPriceItemsDto). Cuando no es null,
   * se valida como un monto normal.
   */
  @ValidateIf((_object, value) => value !== null)
  @IsNotEmpty({ message: 'El precio es requerido' })
  @IsString({
    message: 'El precio debe ser texto después de la transformación',
  })
  @Matches(MONEY_PATTERN, {
    message:
      'El precio debe ser un número positivo con hasta 2 decimales separados por punto',
  })
  @Transform(toMoneyString)
  price!: string | null;
}
