import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Product } from '../generated/prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '../generated/prisma/client'; // Necesitamos esto para Prisma.PrismaClientKnownRequestError

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    await this.assertSkuIsFree(dto.sku);

    return this.prisma.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        unit: dto.unit,
        costPrice: dto.costPrice,
        basePrice: dto.basePrice,
      },
    });
  }

  async findAll(includeInactive = false): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return product;
  }

  async findBySku(sku: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { sku } });

    if (!product) {
      throw new NotFoundException(`Producto con SKU ${sku} no encontrado`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    if (dto.sku) {
      // Necesitamos verificar esto antes para no intentar actualizar con un SKU duplicado
      await this.assertSkuIsFree(dto.sku, id);
    }

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          sku: dto.sku,
          name: dto.name,
          unit: dto.unit,
          costPrice: dto.costPrice !== undefined ? dto.costPrice : undefined,
          basePrice: dto.basePrice !== undefined ? dto.basePrice : undefined,
        },
      });
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      throw error; // Si no es P2025, relanza el error original
    }
  }

  /**
   * Baja lógica. No se borra físicamente: el producto está referenciado por
   * lotes, items de pedido y listas de precios, y el histórico no debe
   * romperse (el schema usa onDelete: Restrict en esas relaciones).
   */
  async deactivate(id: string): Promise<Product> {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      throw error;
    }
  }

  async reactivate(id: string): Promise<Product> {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { isActive: true },
      });
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

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Ya existe un producto con el SKU ${sku}`);
    }
  }

  /**
   * Intercepta el error P2025 de Prisma (Record to update not found).
   * Centraliza la conversión de errores de base de datos a excepciones HTTP.
   */
  private handlePrismaRecordNotFound(error: any, id: string): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
  }
}