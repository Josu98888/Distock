import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * Todos los campos son opcionales. El estado (`isActive`) no se edita acá:
 * se maneja con endpoints de baja/alta, igual que en Users y Products.
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
