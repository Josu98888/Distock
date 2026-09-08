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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PriceListService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { SyncPriceItemsDto } from './dto/sync-price-items.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Listas de precios')
@ApiBearerAuth()
@Controller('price-lists')
@UseGuards(RolesGuard)
export class PriceListController {
  constructor(private readonly priceListService: PriceListService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lista de precios creada exitosamente')
  @ApiOperation({ summary: 'Crea una nueva lista de precios' })
  @ApiResponse({
    status: 201,
    description: 'Lista de precios creada exitosamente',
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
  create(@Body() dto: CreatePriceListDto) {
    return this.priceListService.createPriceList(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Listas de precios encontradas exitosamente')
  @ApiOperation({ summary: 'Lista las listas de precios' })
  @ApiResponse({
    status: 200,
    description: 'Listas de precios encontradas exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'El usuario no está autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene el rol requerido (ADMIN o SELLER)',
  })
  findAll() {
    return this.priceListService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @ResponseMessage('Lista de precios encontrada exitosamente')
  @ApiOperation({ summary: 'Busca una lista de precios por su id' })
  @ApiResponse({
    status: 200,
    description: 'Lista de precios encontrada exitosamente',
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
    description: 'No existe una lista de precios con ese id',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.priceListService.findOneWithItems(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Lista de precios actualizada exitosamente')
  @ApiOperation({ summary: 'Actualiza los datos de cabecera de una lista de precios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de precios actualizada exitosamente',
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
    description: 'No existe una lista de precios con ese id',
  })
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
  @ApiOperation({ summary: 'Reemplaza el estado completo de precios de una lista' })
  @ApiResponse({
    status: 200,
    description: 'Precios sincronizados exitosamente',
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
    description: 'No existe una lista de precios con ese id',
  })
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
  @ApiOperation({ summary: 'Elimina una lista de precios' })
  @ApiResponse({
    status: 204,
    description: 'Lista de precios eliminada exitosamente',
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
    description: 'No existe una lista de precios con ese id',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.priceListService.deletePriceList(id);
  }
}
