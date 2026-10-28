import { Module } from '@nestjs/common'
import { CheckoutController } from './checkout.controller'
import { CheckoutService } from './checkout.service'
import { PaymentService } from './payment.service'

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, PaymentService],
})
export class CheckoutModule {}
