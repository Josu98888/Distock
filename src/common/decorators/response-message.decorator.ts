import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Decorador de método: permite que un endpoint puntual defina su propio
 * mensaje de éxito, en vez de depender del genérico basado en el status code.
 *
 * Uso:
 *   @Post()
 *   @ResponseMessage('Usuario creado correctamente')
 *   create(@Body() dto: CreateUserDto) { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
