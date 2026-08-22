import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PriceListService } from './price-lists.service';

/**
 * `PriceList` es el Aggregate Root: los `PriceListItem` no tienen módulo propio,
 * se gestionan siempre a través de su lista contenedora.
 *
 * Controller y service se registran acá cuando se implementen.
 */
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [PriceListService],
  exports: [PriceListService],
})
export class PriceListsModule {}
