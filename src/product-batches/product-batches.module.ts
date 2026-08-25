import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProductBatchesService } from './product-batches.service';

/**
 * Todavía sin controller: falta exponer los endpoints HTTP de lotes.
 */
@Module({
  imports: [PrismaModule],
  providers: [ProductBatchesService],
  exports: [ProductBatchesService],
})
export class ProductBatchesModule {}
