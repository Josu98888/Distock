import {
  PriceList,
  PriceListItem,
  Product,
} from '../../generated/prisma/client';

type DecimalLike = { toString(): string };

// Shape que espera el DTO: el item con su product ya incluido (findMany con include)
type PriceListItemWithProduct = Omit<PriceListItem, 'price'> & {
  price: DecimalLike;
  product: Omit<Product, 'costPrice' | 'basePrice'> & {
    costPrice: DecimalLike;
    basePrice: DecimalLike;
  };
};

type PriceListWithItems = PriceList & {
  items?: PriceListItemWithProduct[];
};

class PriceListItemResponseDto {
  productId: string;
  sku: string;
  name: string;
  basePrice: string;
  price: string; // precio específico de esta lista

  constructor(item: PriceListItemWithProduct) {
    this.productId = item.product.id;
    this.sku = item.product.sku;
    this.name = item.product.name;
    this.basePrice = item.product.basePrice.toString();
    this.price = item.price.toString();
  }
}

export class PriceListResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: PriceListItemResponseDto[];

  constructor(priceList: PriceListWithItems) {
    this.id = priceList.id;
    this.name = priceList.name;
    this.isActive = priceList.isActive;
    this.createdAt = priceList.createdAt;
    this.updatedAt = priceList.updatedAt;
    this.items = (priceList.items ?? []).map(
      (item) => new PriceListItemResponseDto(item),
    );
  }
}
