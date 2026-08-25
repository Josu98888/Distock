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
import { ProductBatchesService } from './product-batches.service';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { AdjustBatchStockDto } from './dto/adjust-batch-stock.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('product-batches')
@UseGuards(RolesGuard)
export class ProductBatchesController {
  constructor(private readonly productBatchesService: ProductBatchesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lote creado exitosamente')
  create(@Body() dto: CreateProductBatchDto) {
    return this.productBatchesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Lotes encontrados exitosamente')
  findAll(
    @Query('productId') productId?: string,
    @Query('hasStock') hasStock?: string,
  ) {
    return this.productBatchesService.findAll(productId, hasStock === 'true');
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Lote encontrado exitosamente')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productBatchesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lote actualizado exitosamente')
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
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustBatchStockDto,
  ) {
    return this.productBatchesService.adjustStock(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lote eliminado exitosamente')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.productBatchesService.remove(id);
  }
}
