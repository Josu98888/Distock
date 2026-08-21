import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsString({ message: 'El email debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(255, { message: 'El email es demasiado largo' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.toLowerCase().trim() : (value as unknown),
  )
  email!: string;

  @IsString()
  @MaxLength(72, {
    message: 'La contraseña no puede superar los 72 caracteres',
  })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  password!: string;
}
