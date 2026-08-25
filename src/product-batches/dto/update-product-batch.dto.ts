import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProductBatchDto } from './create-product-batch.dto';

/**
 * `productId` no se edita: un lote no cambia de producto, se da de baja y
 * se crea uno nuevo. `quantityReceived`/`quantityAvailable` tampoco: se
 * manejan con las asignaciones (allocations) al despachar pedidos.
 * Solo quedan editables `batchNumber` y `expirationDate`.
 */
export class UpdateProductBatchDto extends PartialType(
  OmitType(CreateProductBatchDto, ['productId', 'quantityReceived'] as const),
) {}
