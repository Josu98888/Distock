import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { SyncPriceItemsDto } from './dto/sync-price-items.dto';
import { PriceListResponseDto } from './dto/price-list-response.dto';
import { PriceListBasicResponseDto } from './dto/price-list-basic-response.dto';

@Injectable()
export class PriceListService {
  constructor(private readonly prisma: PrismaService) {}

  async createPriceList(
    dto: CreatePriceListDto,
  ): Promise<PriceListBasicResponseDto> {
    const existing = await this.prisma.priceList.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una lista de precios con el nombre "${dto.name}"`,
      );
    }

    const priceList = await this.prisma.priceList.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
        items: dto.items?.length
          ? {
              create: dto.items.map((item) => {
                if (item.price === null) {
                  throw new BadRequestException(
                    `El producto "${item.productId}" requiere un precio para crear la lista`,
                  );
                }

                return {
                  productId: item.productId,
                  price: item.price,
                };
              }),
            }
          : undefined,
      },
    });

    return new PriceListBasicResponseDto(priceList);
  }

  async updatePriceList(
    id: string,
    dto: UpdatePriceListDto,
  ): Promise<PriceListBasicResponseDto> {
    const existing = await this.prisma.priceList.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `No se encontró la lista de precios con id "${id}"`,
      );
    }

    if (dto.name && dto.name !== existing.name) {
      const nameTaken = await this.prisma.priceList.findUnique({
        where: { name: dto.name },
      });

      if (nameTaken) {
        throw new ConflictException(
          `Ya existe una lista de precios con el nombre "${dto.name}"`,
        );
      }
    }

    const updated = await this.prisma.priceList.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
      },
    });

    return new PriceListBasicResponseDto(updated);
  }

  async deletePriceList(id: string): Promise<void> {
    const existing = await this.prisma.priceList.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `No se encontró la lista de precios con id "${id}"`,
      );
    }

    const customersCount = await this.prisma.customer.count({
      where: { priceListId: id },
    });

    if (customersCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la lista: tiene ${customersCount} cliente(s) asignado(s)`,
      );
    }

    try {
      await this.prisma.priceList.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'No se puede eliminar la lista: tiene clientes asignados',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<PriceListBasicResponseDto[]> {
    const priceLists = await this.prisma.priceList.findMany({
      orderBy: { name: 'asc' },
    });

    return priceLists.map(
      (priceList) => new PriceListBasicResponseDto(priceList),
    );
  }

  async findOneWithItems(id: string): Promise<PriceListResponseDto> {
    const priceList = await this.prisma.priceList.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!priceList) {
      throw new NotFoundException(
        `No se encontró la lista de precios con id "${id}"`,
      );
    }

    return new PriceListResponseDto(priceList);
  }

  async syncPriceItems(
    priceListId: string,
    dto: SyncPriceItemsDto,
  ): Promise<PriceListResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      const priceList = await tx.priceList.findUnique({
        where: { id: priceListId },
      });

      if (!priceList) {
        throw new NotFoundException(
          `No se encontró la lista de precios con id "${priceListId}"`,
        );
      }

      const productIds = dto.items.map((item) => item.productId);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productsMap = new Map(products.map((p) => [p.id, p]));

      for (const item of dto.items) {
        const product = productsMap.get(item.productId);

        if (!product) {
          throw new NotFoundException(
            `El producto con id "${item.productId}" no existe`,
          );
        }

        if (item.price === null) continue;

        const newPrice = new Prisma.Decimal(item.price);

        if (newPrice.lt(product.costPrice)) {
          throw new BadRequestException(
            `El precio de "${product.name}" ($${newPrice.toString()}) no puede ser menor al costo ($${product.costPrice.toString()})`,
          );
        }
      }

      for (const item of dto.items) {
        if (item.price === null) {
          await tx.priceListItem.deleteMany({
            where: { priceListId, productId: item.productId },
          });
          continue;
        }

        await tx.priceListItem.upsert({
          where: {
            priceListId_productId: {
              priceListId,
              productId: item.productId,
            },
          },
          create: {
            priceListId,
            productId: item.productId,
            price: item.price,
          },
          update: {
            price: item.price,
          },
        });
      }
    });

    return this.findOneWithItems(priceListId);
  }
}
