import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { AdjustBatchStockDto } from './dto/adjust-batch-stock.dto';
import { ProductBatchResponseDto } from './dto/product-batch-response.dto';

// Type Guard para tipar estrictamente el error sin usar 'any'
interface PrismaError {
  code: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

// Selección consistente para no traer el producto completo en cada query.
const PRODUCT_SELECT = { sku: true, name: true, unit: true } as const;

@Injectable()
export class ProductBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductBatchDto): Promise<ProductBatchResponseDto> {
    try {
      const batch = await this.prisma.productBatch.create({
        data: {
          productId: dto.productId,
          batchNumber: dto.batchNumber,
          expirationDate: dto.expirationDate,
          quantityReceived: dto.quantityReceived,
          // Al alta, todo lo recibido está disponible.
          quantityAvailable: dto.quantityReceived,
        },
        include: { product: { select: PRODUCT_SELECT } },
      });

      return new ProductBatchResponseDto(batch);
    } catch (error) {
      this.handlePrismaForeignKeyViolation(error, dto.productId);
      this.handlePrismaUniqueBatchNumber(error, dto.batchNumber);
      throw error;
    }
  }

  async findAll(
    productId?: string,
    hasStock?: boolean,
  ): Promise<ProductBatchResponseDto[]> {
    const batches = await this.prisma.productBatch.findMany({
      where: {
        productId: productId ?? undefined,
        quantityAvailable: hasStock ? { gt: 0 } : undefined,
      },
      orderBy: { expirationDate: 'asc' },
      include: { product: { select: PRODUCT_SELECT } },
    });

    return batches.map((batch) => new ProductBatchResponseDto(batch));
  }

  async findOne(id: string): Promise<ProductBatchResponseDto> {
    const batch = await this.prisma.productBatch.findUnique({
      where: { id },
      include: { product: { select: PRODUCT_SELECT } },
    });

    if (!batch) {
      throw new NotFoundException(`Lote con id ${id} no encontrado`);
    }

    return new ProductBatchResponseDto(batch);
  }

  async update(
    id: string,
    dto: UpdateProductBatchDto,
  ): Promise<ProductBatchResponseDto> {
    try {
      const batch = await this.prisma.productBatch.update({
        where: { id },
        data: {
          batchNumber: dto.batchNumber,
          expirationDate: dto.expirationDate,
        },
        include: { product: { select: PRODUCT_SELECT } },
      });

      return new ProductBatchResponseDto(batch);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      this.handlePrismaUniqueBatchNumber(error, dto.batchNumber);
      throw error;
    }
  }

  async remove(id: string): Promise<ProductBatchResponseDto> {
    try {
      const batch = await this.prisma.productBatch.delete({
        where: { id },
        include: { product: { select: PRODUCT_SELECT } },
      });

      return new ProductBatchResponseDto(batch);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      this.handlePrismaBatchHasMovements(error);
      throw error;
    }
  }

  async adjustStock(
    id: string,
    dto: AdjustBatchStockDto,
  ): Promise<ProductBatchResponseDto> {
    const existing = await this.prisma.productBatch.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Lote con id ${id} no encontrado`);
    }

    if (Number(dto.quantity) > Number(existing.quantityReceived.toString())) {
      throw new BadRequestException(
        'La cantidad disponible no puede ser mayor a la cantidad recibida del lote',
      );
    }

    const batch = await this.prisma.productBatch.update({
      where: { id },
      data: { quantityAvailable: dto.quantity },
      include: { product: { select: PRODUCT_SELECT } },
    });

    return new ProductBatchResponseDto(batch);
  }

  private handlePrismaRecordNotFound(error: unknown, id: string): void {
    // Usamos el Type Guard para evaluar con total seguridad y 0 dependencias externas
    if (isPrismaError(error) && error.code === 'P2025') {
      throw new NotFoundException(`Lote con id ${id} no encontrado`);
    }
  }

  // P2003: la FK productId apunta a un producto inexistente.
  private handlePrismaForeignKeyViolation(
    error: unknown,
    productId?: string,
  ): void {
    if (isPrismaError(error) && error.code === 'P2003') {
      throw new BadRequestException(
        `El producto ${productId ?? ''} no existe`.trim(),
      );
    }
  }

  // P2002: viola el constraint @@unique([productId, batchNumber]).
  private handlePrismaUniqueBatchNumber(
    error: unknown,
    batchNumber?: string,
  ): void {
    if (isPrismaError(error) && error.code === 'P2002') {
      throw new ConflictException(
        `Ya existe un lote con el número ${batchNumber ?? ''} para este producto`.trim(),
      );
    }
  }

  // P2003 en delete: el lote es referenciado por OrderItemBatchAllocation
  // (ya tiene movimientos), no se puede borrar sin romper esas referencias.
  private handlePrismaBatchHasMovements(error: unknown): void {
    if (isPrismaError(error) && error.code === 'P2003') {
      throw new ConflictException(
        'No se puede eliminar el lote porque ya tiene movimientos registrados',
      );
    }
  }
}
