import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PriceListService } from './price-lists.service';
import { PriceListController } from './price-list.controller';

/**
 * `PriceList` es el Aggregate Root: los `PriceListItem` no tienen módulo propio,
 * se gestionan siempre a través de su lista contenedora.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PriceListController],
  providers: [PriceListService],
  exports: [PriceListService],
})
export class PriceListsModule {}
