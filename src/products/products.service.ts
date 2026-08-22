import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

// Type Guard para tipar estrictamente el error sin usar 'any'
interface PrismaError {
  code: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    await this.assertSkuIsFree(dto.sku);

    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        unit: dto.unit,
        costPrice: dto.costPrice,
        basePrice: dto.basePrice,
      },
    });

    return new ProductResponseDto(product);
  }

  async findAll(includeInactive = false): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });

    return products.map((product) => new ProductResponseDto(product));
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return new ProductResponseDto(product);
  }

  async findBySku(sku: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { sku } });

    if (!product) {
      throw new NotFoundException(`Producto con SKU ${sku} no encontrado`);
    }

    return new ProductResponseDto(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    if (dto.sku) {
      await this.assertSkuIsFree(dto.sku, id);
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          sku: dto.sku,
          name: dto.name,
          unit: dto.unit,
          costPrice: dto.costPrice !== undefined ? dto.costPrice : undefined,
          basePrice: dto.basePrice !== undefined ? dto.basePrice : undefined,
        },
      });
      return new ProductResponseDto(product);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      throw error;
    }
  }

  async deactivate(id: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return new ProductResponseDto(product);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      throw error;
    }
  }

  async reactivate(id: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: { isActive: true },
      });
      return new ProductResponseDto(product);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      throw error;
    }
  }

  private async assertSkuIsFree(
    sku: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.product.findUnique({ where: { sku } });

    // Nota: usando estricta igualdad (===) para respetar las mejores prácticas
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Ya existe un producto con el SKU ${sku}`);
    }
  }

  private handlePrismaRecordNotFound(error: unknown, id: string): void {
    // Usamos el Type Guard para evaluar con total seguridad y 0 dependencias externas
    if (isPrismaError(error) && error.code === 'P2025') {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
  }
}
