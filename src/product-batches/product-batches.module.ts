import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Todavía sin service/controller: por ahora solo deja el módulo listo
 * (con Prisma importado) para cuando se agregue la lógica de lotes.
 */
@Module({
  imports: [PrismaModule],
})
export class ProductBatchesModule {}
