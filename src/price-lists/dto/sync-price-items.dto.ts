import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PriceListItemInputDto } from './price-list-item-input.dto';

/**
 * Reemplaza el estado completo de precios de una lista.
 * Pensado para carga masiva desde Excel o edición batch en el backoffice.
 * Enviar items: [] vacía todos los precios de la lista.
 */
export class SyncPriceItemsDto {
  /**
   * Estado completo de precios de la lista. Enviar `[]` vacía todos los precios.
   * @example [{ "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "price": "199.99" }]
   */
  @IsArray({ message: 'items debe ser un arreglo' })
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => PriceListItemInputDto)
  items!: PriceListItemInputDto[];
}
