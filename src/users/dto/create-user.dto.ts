import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { UserRole } from '../../generated/prisma/client';

export class CreateUserDto {
  /**
   * Nombre completo del usuario.
   * @example "Josué Aquino"
   */
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @MinLength(4, { message: 'El nombre debe tener al menos 4 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  fullName!: string;

  /**
   * Correo electrónico único del usuario.
   * @example "usuario@example.com"
   */
  @IsString({ message: 'El email debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(255, { message: 'El email es demasiado largo' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.toLowerCase().trim() : (value as unknown),
  )
  email!: string;

  /**
   * Contraseña del usuario. Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
   * @example "Passw0rd!"
   */
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

  /**
   * Rol del usuario dentro del sistema.
   * @example "SELLER"
   */
  @IsNotEmpty({ message: 'El rol es requerido' })
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN o SELLER' })
  role!: UserRole;
}
