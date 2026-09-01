import {
  Post,
  Body,
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductBatchesService } from './product-batches.service';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { AdjustBatchStockDto } from './dto/adjust-batch-stock.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { SkipResponseTransform } from '@/common/decorators/skip-response-transform.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Lotes de producto')
@Controller('product-batches')
@UseGuards(RolesGuard)
export class ProductBatchesController {
  constructor(private readonly productBatchesService: ProductBatchesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lote creado exitosamente')
  @ApiOperation({ summary: 'Crea un nuevo lote de producto' })
  @ApiResponse({
    status: 201,
    description: 'Lote creado exitosamente',
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
  create(@Body() dto: CreateProductBatchDto) {
    return this.productBatchesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Lotes encontrados exitosamente')
  @ApiOperation({ summary: 'Lista los lotes de producto' })
  @ApiResponse({
    status: 200,
    description: 'Lotes encontrados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  findAll(
    @Query('productId') productId?: string,
    @Query('hasStock') hasStock?: string,
  ) {
    return this.productBatchesService.findAll(productId, hasStock === 'true');
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Lote encontrado exitosamente')
  @ApiOperation({ summary: 'Busca un lote de producto por su id' })
  @ApiResponse({
    status: 200,
    description: 'Lote encontrado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe un lote con ese id',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productBatchesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lote actualizado exitosamente')
  @ApiOperation({ summary: 'Actualiza el número de lote o la fecha de vencimiento' })
  @ApiResponse({
    status: 200,
    description: 'Lote actualizado exitosamente',
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
    description: 'No existe un lote con ese id',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductBatchDto,
  ) {
    return this.productBatchesService.update(id, dto);
  }

  /**
   * Ajusta `quantityAvailable` a un valor absoluto (no un delta). Va aparte
   * de `update` porque cambia el stock disponible, algo que el update
   * general no puede tocar.
   */
  @Patch(':id/stock')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Stock del lote ajustado exitosamente')
  @ApiOperation({ summary: 'Ajusta el stock disponible de un lote' })
  @ApiResponse({
    status: 200,
    description: 'Stock del lote ajustado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Los datos enviados no son válidos o la cantidad supera lo recibido',
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
    description: 'No existe un lote con ese id',
  })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustBatchStockDto,
  ) {
    return this.productBatchesService.adjustStock(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  // Un 204 no debería llevar body, así que se salta el envoltorio del
  // TransformInterceptor en vez de dejar que le agregue uno igual.
  @SkipResponseTransform()
  @ApiOperation({ summary: 'Elimina un lote de producto' })
  @ApiResponse({
    status: 204,
    description: 'Lote eliminado exitosamente',
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
    description: 'No existe un lote con ese id',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.productBatchesService.remove(id);
  }
}
