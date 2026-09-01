import {
  Order,
  OrderItem,
  OrderItemBatchAllocation,
} from '../../generated/prisma/client';

// Tipado estructural: le decimos a TS/ESLint exactamente qué usamos del Decimal.
// unitCost, totalCost y grossMargin NO forman parte de estos tipos: no deben
// poder filtrarse hacia el DTO de salida bajo ningún query.
type OrderItemBatchAllocationWithDecimals = Omit<
  OrderItemBatchAllocation,
  'quantity'
> & {
  quantity: { toString(): string };
};

type OrderItemWithDecimals = Omit<
  OrderItem,
  'quantity' | 'unitPrice' | 'unitCost' | 'subtotal'
> & {
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  subtotal: { toString(): string };
  // Presente solo cuando el query hace include de las asignaciones de lote.
  batchAllocations?: OrderItemBatchAllocationWithDecimals[];
};

type OrderWithDecimals = Omit<
  Order,
  'totalAmount' | 'totalCost' | 'grossMargin'
> & {
  totalAmount: { toString(): string };
  // Presente solo cuando el query hace include de los items del pedido.
  items?: OrderItemWithDecimals[];
};

/**
 * OrderItemBatchAllocationResponseDto (hoja):
 * qué lote y cuánta cantidad se descontó de él para cubrir un item.
 */
export class OrderItemBatchAllocationResponseDto {
  batchId: string;
  quantity: string;

  constructor(allocation: OrderItemBatchAllocationWithDecimals) {
    this.batchId = allocation.batchId;
    this.quantity = allocation.quantity.toString();
  }
}

/**
 * OrderItemResponseDto (rama):
 * línea comercial del pedido. Expone el precio final cobrado (unitPrice),
 * nunca el costo (unitCost) ni el margen.
 */
export class OrderItemResponseDto {
  productId: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  batchAllocations: OrderItemBatchAllocationResponseDto[];

  constructor(item: OrderItemWithDecimals) {
    this.productId = item.productId;
    this.quantity = item.quantity.toString();
    this.unitPrice = item.unitPrice.toString();
    this.subtotal = item.subtotal.toString();
    this.batchAllocations = (item.batchAllocations ?? []).map(
      (allocation) => new OrderItemBatchAllocationResponseDto(allocation),
    );
  }
}

/**
 * OrderResponseDto (tronco):
 * REGLA CRÍTICA: oculta totalCost y grossMargin (costo y margen de ganancia).
 */
export class OrderResponseDto {
  id: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: Date;
  items: OrderItemResponseDto[];

  constructor(order: OrderWithDecimals) {
    this.id = order.id;
    this.customerId = order.customerId;
    this.status = order.status;
    this.paymentStatus = order.paymentStatus;
    this.totalAmount = order.totalAmount.toString();
    this.createdAt = order.createdAt;
    this.items = (order.items ?? []).map(
      (item) => new OrderItemResponseDto(item),
    );
  }
}
