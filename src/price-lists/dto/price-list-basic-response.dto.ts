import { PriceList } from '../../generated/prisma/client';

type PriceListWithCount = PriceList & { _count?: { items: number } };

/**
 * Respuesta para métodos que solo tocan la cabecera de la lista.
 * `itemsCount` viene de `_count.items` cuando el caller lo incluyó en el
 * query (ver `findAll`); si no, se puede pisar con el segundo parámetro del
 * constructor (ver `createPriceList`/`updatePriceList`, que ya conocen el
 * conteo real sin necesidad de un include extra).
 */
export class PriceListBasicResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  updatedAt: Date;
  itemsCount: number;

  constructor(priceList: PriceListWithCount, itemsCount?: number) {
    this.id = priceList.id;
    this.name = priceList.name;
    this.isActive = priceList.isActive;
    this.updatedAt = priceList.updatedAt;
    this.itemsCount = itemsCount ?? priceList._count?.items ?? 0;
  }
}
