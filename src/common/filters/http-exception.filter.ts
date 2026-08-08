import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Mismo criterio que en TransformInterceptor: nombro esto "ApiErrorResponse"
 * y no "ErrorResponse" a secas para que el nombre sea inequívoco al importar
 * en otros archivos, y para que sea claro que es EL contra-par exacto de
 * ApiResponse<T> del interceptor de éxito.
 */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

/**
 * @Catch() sin argumentos = atrapa TODO, no solo HttpException.
 * Esto es deliberado: un error de Prisma, un throw de un string suelto,
 * o cualquier excepción no controlada también tiene que salir con esta forma,
 * no como el HTML de error default de Express ni un stack trace crudo al cliente.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  // Logger con el nombre de la clase, para que en los logs quede claro
  // que el error viene filtrado por acá y no por otro lado.
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.parseException(exception);

    // Los errores 5xx (no anticipados) se loguean con el stack completo:
    // son bugs, necesitás poder rastrearlos. Los 4xx (validación, not found,
    // conflict) son parte normal del flujo de negocio y no ensucian el log
    // como si fueran errores del sistema.
    //
    // Se compara contra el literal 500, no contra HttpStatus.INTERNAL_SERVER_ERROR:
    // "statusCode" es un number simple (puede venir de exception.getStatus(),
    // que no está tipado como el enum HttpStatus), y ESLint marca como insegura
    // la comparación entre un number y un miembro de enum nominal
    // (regla no-unsafe-enum-comparison).
    if (statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        stack,
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private parseException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    // Caso 1: excepciones controladas de Nest (NotFoundException,
    // ConflictException, BadRequestException del ValidationPipe, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // El ValidationPipe de class-validator arma un objeto response con forma
      // { statusCode, message: string[], error: 'Bad Request' } — hay que
      // desarmarlo para no anidar "message" adentro de "message".
      if (typeof response === 'object' && response !== null) {
        const res = response as {
          message?: string | string[];
          error?: string;
        };
        return {
          statusCode: status,
          message: res.message ?? exception.message,
          error: res.error ?? exception.name,
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: exception.name,
      };
    }

    // Caso 2: cualquier otra cosa no anticipada (error de Prisma, un throw
    // de string suelto, un null pointer). Nunca se expone el mensaje real
    // ni el stack al cliente — eso puede filtrar detalles internos
    // (nombres de tabla, rutas de archivo, versión de librería). Se loguea
    // completo del lado del server y al cliente se le da un mensaje genérico.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrió un error interno en el servidor',
      error: 'Internal Server Error',
    };
  }
}
