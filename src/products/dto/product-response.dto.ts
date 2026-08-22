import { Product } from '../../generated/prisma/client';

// Tipado estructural: Le decimos a TS/ESLint exactamente qué usamos del Decimal.
type ProductWithDecimals = Omit<Product, 'costPrice' | 'basePrice'> & {
  costPrice: { toString(): string };
  basePrice: { toString(): string };
};

export class ProductResponseDto {
  id: string;
  sku: string;
  name: string;
  unit: string;
  costPrice: string;
  basePrice: string;
  isActive: boolean;

  constructor(product: ProductWithDecimals) {
    this.id = product.id;
    this.sku = product.sku;
    this.name = product.name;
    this.unit = product.unit;
    this.costPrice = product.costPrice.toString();
    this.basePrice = product.basePrice.toString();
    this.isActive = product.isActive;
  }
}
