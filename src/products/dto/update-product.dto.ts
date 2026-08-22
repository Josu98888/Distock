import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

/**
 * Todos los campos son opcionales. El estado (`isActive`) no se edita acá:
 * se maneja con endpoints de baja/alta, igual que en Users.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
