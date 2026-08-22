import {
  Post,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PriceListService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { SyncPriceItemsDto } from './dto/sync-price-items.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('price-lists')
@UseGuards(RolesGuard)
export class PriceListController {
  constructor(private readonly priceListService: PriceListService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lista de precios creada exitosamente')
  create(@Body() dto: CreatePriceListDto) {
    return this.priceListService.createPriceList(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Listas de precios encontradas exitosamente')
  findAll() {
    return this.priceListService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Lista de precios encontrada exitosamente')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.priceListService.findOneWithItems(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lista de precios actualizada exitosamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.priceListService.updatePriceList(id, dto);
  }

  /**
   * Reemplazo masivo de precios (alta, edición y baja de items en un solo
   * request). Es PUT y no PATCH porque el resultado es idempotente: mandar
   * el mismo body dos veces deja la lista en el mismo estado.
   */
  @Put(':id/items')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Precios sincronizados exitosamente')
  syncItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncPriceItemsDto,
  ) {
    return this.priceListService.syncPriceItems(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lista de precios eliminada exitosamente')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.priceListService.deletePriceList(id);
  }
}
