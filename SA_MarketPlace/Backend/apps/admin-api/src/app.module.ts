import * as path from 'path'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { XssProtectionMiddleware } from '@sa-marketplace/common'
import { DatabaseModule } from '@sa-marketplace/entities'
import { AuthModule } from './modules/auth/auth.module'
import { OrdersModule } from './modules/orders/orders.module'
import { SuppliersModule } from './modules/suppliers/suppliers.module'

@Module({
  imports: [
    // Backend/.env, three levels up from src/ and dist/. Also covers e2e tests, where
    // main.ts does not run. Existing process.env values take precedence.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../../.env'),
    }),
    DatabaseModule.forRoot(),
    AuthModule,
    SuppliersModule,
    OrdersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Nest 10 wildcard is '*'. '/{*any}' is Nest 11 syntax and silently never matches.
    consumer.apply(XssProtectionMiddleware).forRoutes('*')
  }
}
