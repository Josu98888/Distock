import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * `PriceList` es el Aggregate Root: los `PriceListItem` no tienen módulo propio,
 * se gestionan siempre a través de su lista contenedora.
 *
 * Controller y service se registran acá cuando se implementen.
 */
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class PriceListsModule {}
