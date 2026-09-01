import { Product, ProductBatch } from '../../generated/prisma/client';

// Tipado estructural: Le decimos a TS/ESLint exactamente qué usamos del Decimal.
type ProductBatchWithDecimals = Omit<
  ProductBatch,
  'quantityReceived' | 'quantityAvailable'
> & {
  quantityReceived: { toString(): string };
  quantityAvailable: { toString(): string };
  // Presente solo cuando el query hace include/select del producto relacionado.
  product?: Partial<Product>;
};

export class ProductBatchResponseDto {
  id: string;
  productId: string;
  batchNumber: string;
  expirationDate: Date;
  quantityReceived: string;
  quantityAvailable: string;

  productSku?: string;
  productName?: string;
  productUnit?: string;

  constructor(batch: ProductBatchWithDecimals) {
    this.id = batch.id;
    this.productId = batch.productId;
    this.batchNumber = batch.batchNumber;
    this.expirationDate = batch.expirationDate;
    this.quantityReceived = batch.quantityReceived.toString();
    this.quantityAvailable = batch.quantityAvailable.toString();
    // Si viene el producto, lo aplanamos
    if (batch.product) {
      this.productSku = batch.product.sku;
      this.productName = batch.product.name;
      this.productUnit = batch.product.unit;
    }
  }
}
