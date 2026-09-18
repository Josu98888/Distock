import {
  Post,
  Body,
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductPublicResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Producto creado exitosamente')
  @ApiOperation({ summary: 'Crea un nuevo producto' })
  @ApiResponse({
    status: 201,
    description: 'Producto creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Los datos enviados no son válidos',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.CLIENT)
  @ResponseMessage('Productos encontrados exitosamente')
  @ApiOperation({ summary: 'Lista los productos' })
  @ApiResponse({
    status: 200,
    description: 'Productos encontrados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN, SELLER o CLIENT)',
  })
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('includeInactive') includeInactive?: string,
    @Query('inStockOnly') inStockOnly?: string,
  ) {
    const products = await this.productsService.findAll(
      includeInactive === 'true',
      inStockOnly === 'true',
    );
    return this.hideCostForClient(currentUser, products);
  }

  /**
   * Va declarada antes que :id para dejar explícito que 'sku' es un
   * segmento literal y no un id: el SKU no es UUID y no lleva ParseUUIDPipe.
   */
  @Get('sku/:sku')
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.CLIENT)
  @ResponseMessage('Producto encontrado exitosamente')
  @ApiOperation({ summary: 'Busca un producto por su SKU' })
  @ApiResponse({
    status: 200,
    description: 'Producto encontrado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN, SELLER o CLIENT)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un producto con ese SKU',
  })
  async findBySku(
    @Param('sku') sku: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const product = await this.productsService.findBySku(sku);
    return this.hideCostForClient(currentUser, product);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER, UserRole.CLIENT)
  @ResponseMessage('Producto encontrado exitosamente')
  @ApiOperation({ summary: 'Busca un producto por su id' })
  @ApiResponse({
    status: 200,
    description: 'Producto encontrado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN, SELLER o CLIENT)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un producto con ese id',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const product = await this.productsService.findOne(id);
    return this.hideCostForClient(currentUser, product);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Producto actualizado exitosamente')
  @ApiOperation({ summary: 'Actualiza los datos de un producto' })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Los datos enviados no son válidos',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un producto con ese id',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Producto desactivado exitosamente')
  @ApiOperation({ summary: 'Desactiva un producto' })
  @ApiResponse({
    status: 200,
    description: 'Producto desactivado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un producto con ese id',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Producto reactivado exitosamente')
  @ApiOperation({ summary: 'Reactiva un producto' })
  @ApiResponse({
    status: 200,
    description: 'Producto reactivado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un producto con ese id',
  })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.reactivate(id);
  }

  /**
   * costPrice es información de costo/margen interna: un CLIENT nunca debe
   * verla, aunque sí pueda listar y consultar el catálogo de productos.
   */
  private hideCostForClient<T extends ProductResponseDto | ProductResponseDto[]>(
    currentUser: JwtPayload,
    products: T,
  ): T | ProductPublicResponseDto | ProductPublicResponseDto[] {
    if (currentUser.role !== UserRole.CLIENT) return products;

    return Array.isArray(products)
      ? products.map((product) => new ProductPublicResponseDto(product))
      : new ProductPublicResponseDto(products);
  }
}
