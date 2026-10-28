import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import type { Observable } from 'rxjs'
import { PRODUCT_IMAGE_LIMITS } from './catalogue.constant'

const MAX_MB = PRODUCT_IMAGE_LIMITS.MAX_BYTES / (1024 * 1024)

// Reads the `images` multipart field. Only the messages are customised: multer's own
// ("File too large", "Unexpected field") would not tell the seller what to change.
@Injectable()
export class ProductImagesInterceptor extends FilesInterceptor(
  'images',
  PRODUCT_IMAGE_LIMITS.MAX_COUNT,
  { limits: { fileSize: PRODUCT_IMAGE_LIMITS.MAX_BYTES } },
) {
  override async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    try {
      return await super.intercept(context, next)
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException(
          `Each image must be ${MAX_MB} MB or smaller`,
        )
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(
          `Attach up to ${PRODUCT_IMAGE_LIMITS.MAX_COUNT} images in the "images" field`,
        )
      }
      throw error
    }
  }
}
