import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';

// Type Guard para tipar estrictamente el error sin usar 'any'
interface PrismaError {
  code: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    await this.assertCuitIsFree(dto.cuit);

    try {
      const customer = await this.prisma.customer.create({
        data: {
          businessName: dto.businessName,
          cuit: dto.cuit,
          address: dto.address,
          phone: dto.phone,
          creditLimit: dto.creditLimit,
          priceListId: dto.priceListId,
        },
        include: { priceList: true },
      });

      return new CustomerResponseDto(customer);
    } catch (error) {
      this.handlePrismaForeignKeyViolation(error, dto.priceListId);
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<CustomerResponseDto[]> {
    const customers = await this.prisma.customer.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { businessName: 'asc' },
      include: { priceList: true },
    });

    return customers.map((customer) => new CustomerResponseDto(customer));
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { priceList: true },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    return new CustomerResponseDto(customer);
  }

  async findByCuit(cuit: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { cuit },
      include: { priceList: true },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con CUIT ${cuit} no encontrado`);
    }

    return new CustomerResponseDto(customer);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    if (dto.cuit) {
      await this.assertCuitIsFree(dto.cuit, id);
    }

    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          businessName: dto.businessName,
          cuit: dto.cuit,
          address: dto.address,
          phone: dto.phone,
          creditLimit:
            dto.creditLimit !== undefined ? dto.creditLimit : undefined,
          priceListId: dto.priceListId,
        },
        include: { priceList: true },
      });
      return new CustomerResponseDto(customer);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      this.handlePrismaForeignKeyViolation(error, dto.priceListId);
      throw error;
    }
  }

  async deactivate(id: string): Promise<CustomerResponseDto> {
    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: { isActive: false },
        include: { priceList: true },
      });
      return new CustomerResponseDto(customer);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      throw error;
    }
  }

  async reactivate(id: string): Promise<CustomerResponseDto> {
    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: { isActive: true },
        include: { priceList: true },
      });
      return new CustomerResponseDto(customer);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      throw error;
    }
  }

  private async assertCuitIsFree(
    cuit: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.customer.findUnique({ where: { cuit } });

    // Nota: usando estricta igualdad (===) para respetar las mejores prácticas
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Ya existe un cliente con el CUIT ${cuit}`);
    }
  }

  private handlePrismaRecordNotFound(error: unknown, id: string): void {
    // Usamos el Type Guard para evaluar con total seguridad y 0 dependencias externas
    if (isPrismaError(error) && error.code === 'P2025') {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
  }

  // P2003: la FK priceListId apunta a una lista de precios inexistente.
  // Es un dato inválido del cliente de la API, no un fallo interno.
  private handlePrismaForeignKeyViolation(
    error: unknown,
    priceListId?: string,
  ): void {
    if (isPrismaError(error) && error.code === 'P2003') {
      throw new BadRequestException(
        `La lista de precios ${priceListId ?? ''} no existe`.trim(),
      );
    }
  }
}
