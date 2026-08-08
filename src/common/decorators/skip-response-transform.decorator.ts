import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_TRANSFORM_KEY = 'skip_response_transform';

/**
 * Decorador de método: marca un endpoint para que el TransformInterceptor
 * lo ignore por completo y devuelva la respuesta tal cual el controller la armó.
 *
 * Casos típicos donde hace falta:
 * - Descarga de archivos (StreamableFile, res.download, etc.)
 * - Endpoints de health-check que un load balancer espera en formato específico
 * - Webhooks que responden a un proveedor externo con un contrato fijo
 *
 * Uso:
 *   @Get('export')
 *   @SkipResponseTransform()
 *   exportCsv(): StreamableFile { ... }
 */
export const SkipResponseTransform = () =>
  SetMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true);
