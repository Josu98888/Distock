import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { OrderStatus, PaymentStatus, Prisma } from '../generated/prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';


const ORDER_INCLUDE = {
  items: { include: { batchAllocations: true } },
} satisfies Prisma.OrderInclude;

// Escala de las columnas de cantidad en el schema: Decimal(12, 3).

const QUANTITY_SCALE = 3;

// Transiciones de estado operativo permitidas. CANCELLED solo es alcanzable
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
  DISPATCHED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

interface ComputedOrderItem {
  productId: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  allocations: { batchId: string; quantity: Prisma.Decimal }[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
  ) {}

  // ------------------------------------------------------------
  // 1. ESCRITURA CRÍTICA (enfoque pragmático / monolítico)
  // ------------------------------------------------------------
  // Todo el pedido se resuelve dentro de una única transacción, consultando
  // tx.* directamente. Ningún otro service participa acá: el crédito, el
  // precio, el costo y el stock tienen que verse (y bloquearse) como una
  // sola unidad atómica, o el pedido no se crea.
  async createOrder(
    sellerId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: createOrderDto.customerId },
      });

      if (!customer) {
        throw new BadRequestException(
          `El cliente ${createOrderDto.customerId} no existe`,
        );
      }
      if (!customer.isActive) {
        throw new BadRequestException(
          `El cliente ${customer.businessName} está inactivo`,
        );
      }

      // Precios y costos: resueltos ahora, antes de tocar stock, para no
      // dejar lotes descontados si el pedido termina rechazado más abajo.
      const {
        items: computedItems,
        totalAmount,
        totalCost,
      } = await this.resolveOrderItems(
        tx,
        customer.priceListId,
        createOrderDto.items,
      );

      // Límite de crédito: deuda viva del cliente + este pedido.
      // - Se excluyen los CANCELLED: quedan con paymentStatus PENDING para
      //   siempre (cancelar no cobra nada), así que contarlos inventaría
      //   deuda fantasma y bloquearía al cliente por pedidos que no existen.
      // - Se incluyen los PARTIALLY_PAID por su total: el schema no guarda
      //   cuánto se pagó, así que la única lectura financieramente segura es
      //   tratarlos como impagos. Es conservador a propósito.
      const debtAggregate = await tx.order.aggregate({
        where: {
          customerId: customer.id,
          status: { not: OrderStatus.CANCELLED },
          paymentStatus: {
            in: [PaymentStatus.PENDING, PaymentStatus.PARTIALLY_PAID],
          },
        },
        _sum: { totalAmount: true },
      });
      const previousDebt =
        debtAggregate._sum.totalAmount ?? new Prisma.Decimal(0);
      const projectedDebt = previousDebt.plus(totalAmount);

      if (projectedDebt.greaterThan(customer.creditLimit)) {
        throw new BadRequestException(
          `El pedido excede el límite de crédito del cliente ${customer.businessName}: ` +
            `deuda actual ${previousDebt.toFixed(2)} + este pedido ${totalAmount.toFixed(2)} ` +
            `supera el límite de ${customer.creditLimit.toFixed(2)}`,
        );
      }

      // FEFO: recién acá se descuenta stock real, ya con el crédito validado.
      for (const item of computedItems) {
        item.allocations = await this.allocateFefoStock(
          tx,
          item.productId,
          item.quantity,
        );
      }

      const grossMargin = totalAmount.minus(totalCost);

      // Nested write: cabecera + items + batchAllocations en una sola escritura.
      return tx.order.create({
        data: {
          customerId: customer.id,
          sellerId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: totalAmount.toFixed(2),
          totalCost: totalCost.toFixed(2),
          grossMargin: grossMargin.toFixed(2),
          items: {
            create: computedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity.toString(),
              unitPrice: item.unitPrice.toFixed(2),
              unitCost: item.unitCost.toFixed(2),
              subtotal: item.subtotal.toFixed(2),
              batchAllocations: {
                create: item.allocations.map((allocation) => ({
                  batchId: allocation.batchId,
                  quantity: allocation.quantity.toString(),
                })),
              },
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    return new OrderResponseDto(order);
  }

  // Resuelve producto + precio (PriceListItem, fallback basePrice) + costo
  // para cada línea, y devuelve los totales agregados del pedido.
  private async resolveOrderItems(
    tx: Prisma.TransactionClient,
    priceListId: string,
    items: CreateOrderDto['items'],
  ): Promise<{
    items: ComputedOrderItem[];
    totalAmount: Prisma.Decimal;
    totalCost: Prisma.Decimal;
  }> {
    const productIds = [...new Set(items.map((item) => item.productId))];

    // Un producto repetido generaría dos OrderItem para la misma mercadería,
    // partiendo el remito y el descuento FEFO en dos líneas sin motivo.
    if (productIds.length !== items.length) {
      throw new BadRequestException(
        'El pedido tiene productos repetidos: agrupá cada producto en una sola línea',
      );
    }

    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const priceListItems = await tx.priceListItem.findMany({
      where: { priceListId, productId: { in: productIds } },
    });
    const priceMap = new Map(
      priceListItems.map((item) => [item.productId, item.price]),
    );

    let totalAmount = new Prisma.Decimal(0);
    let totalCost = new Prisma.Decimal(0);
    const computedItems: ComputedOrderItem[] = [];

    for (const itemDto of items) {
      const product = productMap.get(itemDto.productId);

      if (!product) {
        throw new BadRequestException(
          `El producto ${itemDto.productId} no existe`,
        );
      }
      if (!product.isActive) {
        throw new BadRequestException(
          `El producto ${product.sku} está inactivo`,
        );
      }

      // Se trunca a la escala de la columna ANTES de calcular nada: si la
      // cantidad llegara con más decimales, la DB la redondearía al guardarla
      // y el total facturado dejaría de coincidir con la cantidad persistida.
      const quantity = new Prisma.Decimal(itemDto.quantity).toDecimalPlaces(
        QUANTITY_SCALE,
      );

      if (quantity.lessThanOrEqualTo(0)) {
        throw new BadRequestException(
          `La cantidad para el producto ${product.sku} es menor al mínimo facturable (${QUANTITY_SCALE} decimales)`,
        );
      }

      // Precio del cliente según su PriceList; si el producto no tiene precio
      // específico ahí, se cobra basePrice.
      const unitPrice = priceMap.get(product.id) ?? product.basePrice;
      const unitCost = product.costPrice;
      const subtotal = unitPrice.times(quantity).toDecimalPlaces(2);
      const lineCost = unitCost.times(quantity).toDecimalPlaces(2);

      totalAmount = totalAmount.plus(subtotal);
      totalCost = totalCost.plus(lineCost);

      computedItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        unitCost,
        subtotal,
        allocations: [],
      });
    }

    return { items: computedItems, totalAmount, totalCost };
  }

  // FEFO: consume lotes ordenados por vencimiento ascendente. El decremento
  // usa `updateMany` con un `where` que exige stock suficiente en ese mismo
  // UPDATE: si otra transacción concurrente ya se llevó ese stock, la
  // condición no matchea, 0 filas se actualizan y abortamos el pedido en vez
  // de sobrevender. Esto evita la carrera sin necesitar SELECT FOR UPDATE.
  private async allocateFefoStock(
    tx: Prisma.TransactionClient,
    productId: string,
    requiredQuantity: Prisma.Decimal,
  ): Promise<{ batchId: string; quantity: Prisma.Decimal }[]> {
    const batches = await tx.productBatch.findMany({
      where: { productId, quantityAvailable: { gt: 0 } },
      orderBy: { expirationDate: 'asc' },
    });

    const allocations: { batchId: string; quantity: Prisma.Decimal }[] = [];
    let remaining = requiredQuantity;

    for (const batch of batches) {
      if (remaining.lessThanOrEqualTo(0)) break;

      const takeFromBatch = Prisma.Decimal.min(
        remaining,
        batch.quantityAvailable,
      );

      const result = await tx.productBatch.updateMany({
        where: { id: batch.id, quantityAvailable: { gte: takeFromBatch } },
        data: { quantityAvailable: { decrement: takeFromBatch } },
      });

      if (result.count === 0) {
        throw new BadRequestException(
          `Stock insuficiente: el lote ${batch.batchNumber} fue modificado concurrentemente`,
        );
      }

      allocations.push({ batchId: batch.id, quantity: takeFromBatch });
      remaining = remaining.minus(takeFromBatch);
    }

    if (remaining.greaterThan(0)) {
      throw new BadRequestException(
        `Stock insuficiente para cubrir la cantidad pedida (faltan ${remaining.toString()} unidades)`,
      );
    }

    return allocations;
  }

  // ------------------------------------------------------------
  // 2. LOGÍSTICA INVERSA (enfoque pragmático / monolítico)
  // ------------------------------------------------------------
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      throw new NotFoundException(`Pedido con id ${orderId} no encontrado`);
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[existing.status];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `No se puede pasar el pedido de ${existing.status} a ${status}`,
      );
    }

    if (status === OrderStatus.CANCELLED) {
      return this.cancelOrderAndRestoreStock(orderId, existing.status);
    }

    // El estado leído arriba se vuelve a exigir en el WHERE del UPDATE: entre
    // el findUnique y esta escritura otra request pudo haber movido el pedido.
    // Si eso pasó, 0 filas matchean y avisamos, en vez de pisar una transición
    // que ya no es válida desde el estado real.
    const claimed = await this.prisma.order.updateMany({
      where: { id: orderId, status: existing.status },
      data: { status },
    });

    if (claimed.count === 0) {
      throw new ConflictException(
        `El pedido ${orderId} cambió de estado mientras se procesaba la solicitud; reintentá`,
      );
    }

    return this.getOrderById(orderId);
  }

  // Cancelar es la única transición que además mueve inventario, así que va
  // en su propia transacción.
  private async cancelOrderAndRestoreStock(
    orderId: string,
    expectedStatus: OrderStatus,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.$transaction(async (tx) => {
      // Primero se "gana" la cancelación con un UPDATE condicionado al estado
      // previo, y recién después se devuelve el stock. Si se hiciera al revés,
      // dos cancelaciones concurrentes del mismo pedido devolverían las
      // mismas cantidades dos veces e inflarían el stock de esos lotes.
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: expectedStatus },
        data: { status: OrderStatus.CANCELLED },
      });

      if (claimed.count === 0) {
        throw new ConflictException(
          `El pedido ${orderId} ya fue cancelado o cambió de estado mientras se procesaba la solicitud`,
        );
      }

      const allocations = await tx.orderItemBatchAllocation.findMany({
        where: { orderItem: { orderId } },
        select: { batchId: true, quantity: true },
      });

      for (const allocation of allocations) {
        // increment es atómico a nivel fila: seguro aunque otra transacción
        // esté tocando el mismo lote al mismo tiempo.
        await tx.productBatch.update({
          where: { id: allocation.batchId },
          data: { quantityAvailable: { increment: allocation.quantity } },
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });
    });

    return new OrderResponseDto(order);
  }

  // ------------------------------------------------------------
  // 3. LECTURAS Y FINANZAS (arquitectura limpia)
  // ------------------------------------------------------------
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
  ): Promise<OrderResponseDto> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      throw new NotFoundException(`Pedido con id ${orderId} no encontrado`);
    }

    // Registrar un cobro no toca inventario, así que no necesita la
    // transacción monolítica: el dominio del cliente se consulta por su propio
    // service (Arquitectura Limpia) en vez de ir a la tabla por izquierda.
    // findOne lanza NotFound si el cliente fue dado de baja de la base, lo que
    // deja el pedido huérfano antes de tocarle el estado de cobro.
    await this.customersService.findOne(existing.customerId);

    // Mismo guard que updateOrderStatus/cancelOrderAndRestoreStock: el UPDATE
    // vuelve a exigir en el WHERE que el pedido siga existiendo en este
    // instante, en vez de confiar ciegamente en el findUnique de arriba.
    // Sin esto, si la fila desaparece entre el chequeo y la escritura,
    // Prisma tira un PrismaClientKnownRequestError (P2025) que NO es una
    // HttpException: el HttpExceptionFilter lo trataría como bug no
    // anticipado (500 genérico + log de error) en lugar del 404 de negocio
    // que corresponde acá.
    const claimed = await this.prisma.order.updateMany({
      where: { id: orderId },
      data: { paymentStatus },
    });

    if (claimed.count === 0) {
      throw new NotFoundException(`Pedido con id ${orderId} no encontrado`);
    }

    return this.getOrderById(orderId);
  }

  async getOrderById(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Pedido con id ${id} no encontrado`);
    }

    return new OrderResponseDto(order);
  }

  async findAllOrders(sellerId?: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: sellerId ? { sellerId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });

    return orders.map((order) => new OrderResponseDto(order));
  }
}
