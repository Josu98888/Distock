import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProductBatchesService } from './product-batches.service';
import { ProductBatchesController } from './product-batches.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductBatchesController],
  providers: [ProductBatchesService],
  exports: [ProductBatchesService],
})
export class ProductBatchesModule {}
