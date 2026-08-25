import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { ProductBatchesModule } from './product-batches/product-batches.module';
import { CustomersModule } from './customers/customers.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 }, // 3 requests por segundo
      { name: 'long', ttl: 60000, limit: 100 }, // 100 por minuto
    ]),
    PrismaModule,
    UsersModule,
    ProductsModule,
    ProductBatchesModule,
    CustomersModule,
    PriceListsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // 1° ¿no estas abusando?
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    }, // 2º: ¿Tenés un token válido? (pone el user en el request)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }, // 3º: ¿Tenés el rol necesario? (lee el user del request)

    // --- TUS HERRAMIENTAS PERSONALIZADAS ---
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
