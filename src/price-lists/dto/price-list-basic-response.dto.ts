import { PriceList } from '../../generated/prisma/client';

/**
 * Respuesta para métodos que solo tocan la cabecera de la lista
 */
export class PriceListBasicResponseDto {
  id: string;
  name: string;
  isActive: boolean;

  constructor(priceList: PriceList) {
    this.id = priceList.id;
    this.name = priceList.name;
    this.isActive = priceList.isActive;
  }
}
