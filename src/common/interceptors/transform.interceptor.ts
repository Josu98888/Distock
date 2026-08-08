import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorators/skip-response-transform.decorator';

/**
 * Nombrado "ApiResponse" y no "Response" a propósito: "Response" colisiona
 * con el tipo Response de Express, que vas a importar tarde o temprano
 * en algún controller que use @Res(). Evitar el choque de nombres ahora
 * ahorra imports confusos después.
 */
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

const DEFAULT_MESSAGES: Record<number, string> = {
  200: 'Operación exitosa',
  201: 'Creado exitosamente',
  204: 'Operación exitosa',
};

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  // Reflector se inyecta por constructor porque este interceptor se registra
  // como provider (APP_INTERCEPTOR), no con "new TransformInterceptor()" a mano.
  // Eso es justo lo que permite usar Reflector acá: Nest resuelve la dependencia.
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    // Verificación del tipo de contexto: este interceptor SOLO tiene sentido
    // para peticiones HTTP REST. Si se registra globalmente (APP_INTERCEPTOR)
    // y en algún momento el proyecto suma un Gateway de WebSockets, un
    // microservicio (TCP/Redis/Kafka) o un resolver de GraphQL, este mismo
    // interceptor se va a ejecutar igual para esos contextos — y ahí
    // "switchToHttp().getResponse()" no es un Response de Express real,
    // así que rompe. Si no es HTTP, dejamos pasar el dato sin tocarlo.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    // Vía de escape: si el endpoint tiene @SkipResponseTransform(), no tocamos nada.
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();

    // IMPORTANTE: acá NO leemos response.statusCode. Nest recién aplica el
    // status code final sobre el objeto Response de Express en la "fase de
    // reply", que ocurre DESPUÉS de que este interceptor resuelve su
    // observable. Si leyéramos response.statusCode acá (o incluso dentro
    // del map de abajo), siempre nos daría el default de Express (200),
    // sin importar si el endpoint es un POST con 201 o tiene @HttpCode(204).
    //
    // La fuente confiable es la metadata que Nest usa internamente para
    // decidir el status: la de @HttpCode(), con el mismo fallback que usa
    // el framework (201 para POST, 200 para el resto).
    const customStatus = this.reflector.getAllAndOverride<number>(
      HTTP_CODE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    const statusCode = customStatus ?? (request.method === 'POST' ? 201 : 200);

    // Mensaje personalizado con @ResponseMessage(), si el endpoint lo definió;
    // si no, cae al genérico según el status code.
    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data) => {
        // Los StreamableFile (descargas) nunca se envuelven, aunque el endpoint
        // se haya olvidado de poner @SkipResponseTransform(). Es una segunda
        // red de seguridad, no una excusa para no usar el decorador.
        if (data instanceof StreamableFile) {
          return data;
        }

        return {
          success: true,
          statusCode,
          message:
            customMessage ??
            DEFAULT_MESSAGES[statusCode] ??
            'Operación exitosa',
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
