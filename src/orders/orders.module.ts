import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CustomersModule } from '@/customers/customers.module';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule, CustomersModule],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
