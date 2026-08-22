import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

const toMoneyString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim();
  return value;
};

export class PriceListItemInputDto {
  @IsNotEmpty({ message: 'El producto es requerido' })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  productId!: string;

  @IsNotEmpty({ message: 'El precio es requerido' })
  @IsString({
    message: 'El precio debe ser texto después de la transformación',
  })
  @Matches(MONEY_PATTERN, {
    message:
      'El precio debe ser un número positivo con hasta 2 decimales separados por punto',
  })
  @Transform(toMoneyString)
  price!: string;
}
