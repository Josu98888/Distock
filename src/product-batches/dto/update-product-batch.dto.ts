import { PartialType } from '@nestjs/mapped-types';
import { CreateProductBatchDto } from './create-product-batch.dto';

/**
 * Todos los campos son opcionales. `quantityAvailable` no se edita acá:
 * se maneja con las asignaciones (allocations) al despachar pedidos.
 */
export class UpdateProductBatchDto extends PartialType(CreateProductBatchDto) {}
