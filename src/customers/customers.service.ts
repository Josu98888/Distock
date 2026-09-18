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
import { UserRole } from '../generated/prisma/client';

// Type Guard para tipar estrictamente el error sin usar 'any'
interface PrismaError {
  code: string;
  meta?: { target?: string | string[] };
}

function isPrismaError(error: unknown): error is PrismaError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    await this.assertCuitIsFree(dto.cuit);
    await this.assertUserCanBeLinkedAsClient(dto.userId);
    await this.assertUserCanBeAssignedSeller(dto.assignedSellerId);

    try {
      const customer = await this.prisma.customer.create({
        data: {
          businessName: dto.businessName,
          cuit: dto.cuit,
          address: dto.address,
          phone: dto.phone,
          creditLimit: dto.creditLimit,
          priceListId: dto.priceListId,
          userId: dto.userId,
          assignedSellerId: dto.assignedSellerId,
        },
        include: { priceList: true },
      });

      return new CustomerResponseDto(customer);
    } catch (error) {
      this.handlePrismaUniqueConstraintViolation(error, dto.cuit);
      this.handlePrismaForeignKeyViolation(error, dto.priceListId);
      this.handlePrismaUserLinkConflict(error, dto.userId);
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
    await this.assertUserCanBeLinkedAsClient(dto.userId, id);
    await this.assertUserCanBeAssignedSeller(dto.assignedSellerId);

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
          userId: dto.userId,
          assignedSellerId: dto.assignedSellerId,
        },
        include: { priceList: true },
      });
      return new CustomerResponseDto(customer);
    } catch (error) {
      this.handlePrismaRecordNotFound(error, id);
      this.handlePrismaUniqueConstraintViolation(error, dto.cuit);
      this.handlePrismaForeignKeyViolation(error, dto.priceListId);
      this.handlePrismaUserLinkConflict(error, dto.userId);
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

  // P2002 en customers puede venir del CUIT o del userId (ambos @unique):
  // hay que mirar meta.target para no reportar el conflicto equivocado.
  private handlePrismaUniqueConstraintViolation(
    error: unknown,
    cuit?: string,
  ): void {
    if (
      isPrismaError(error) &&
      error.code === 'P2002' &&
      !this.violatesTarget(error, 'user_id')
    ) {
      throw new ConflictException(
        `Ya existe un cliente con el CUIT ${cuit ?? ''}`.trim(),
      );
    }
  }

  private violatesTarget(error: PrismaError, column: string): boolean {
    return !!error.meta?.target?.includes(column);
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

  // Customer.userId es @unique: si el User ya está vinculado a otro
  // Customer, Prisma tira P2002 sobre esa columna en vez de sobre el CUIT.
  private handlePrismaUserLinkConflict(error: unknown, userId?: string): void {
    if (
      isPrismaError(error) &&
      error.code === 'P2002' &&
      this.violatesTarget(error, 'user_id')
    ) {
      throw new ConflictException(
        `El usuario ${userId ?? ''} ya está vinculado a otro cliente`.trim(),
      );
    }
  }

  // El userId de un Customer solo puede apuntar a un User con rol CLIENT:
  // vincular una cuenta ADMIN/SELLER le daría a esa cuenta acceso de cliente
  // sobre este Customer además de sus permisos actuales.
  private async assertUserCanBeLinkedAsClient(
    userId?: string,
    excludeCustomerId?: string,
  ): Promise<void> {
    if (!userId) return;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(`El usuario ${userId} no existe`);
    }
    if (user.role !== UserRole.CLIENT) {
      throw new BadRequestException(
        `El usuario ${userId} no tiene rol CLIENT`,
      );
    }

    const existingLink = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (existingLink && existingLink.id !== excludeCustomerId) {
      throw new ConflictException(
        `El usuario ${userId} ya está vinculado a otro cliente`,
      );
    }
  }

  // assignedSellerId debe apuntar a alguien que efectivamente pueda vender
  // (ADMIN o SELLER), nunca a un CLIENT: si no, un pedido self-service
  // terminaría con un vendedor que en realidad es otro cliente.
  private async assertUserCanBeAssignedSeller(
    assignedSellerId?: string,
  ): Promise<void> {
    if (!assignedSellerId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: assignedSellerId },
    });
    if (!user) {
      throw new BadRequestException(
        `El usuario ${assignedSellerId} no existe`,
      );
    }
    if (user.role === UserRole.CLIENT) {
      throw new BadRequestException(
        `El usuario ${assignedSellerId} tiene rol CLIENT y no puede ser vendedor de cuenta`,
      );
    }
  }
}
