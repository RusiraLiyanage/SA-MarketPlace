import * as path from 'path'
import * as compression from 'compression'
import * as dotenv from 'dotenv'
import { Logger, LogLevel, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import {
  AllExceptionsFilter,
  AppEnv,
  loadAppConfig,
  PRODUCT_IMAGE_DIR,
  PRODUCT_IMAGE_URL_PREFIX,
} from '@sa-marketplace/common'
import { Request, Response } from 'express'
import {
  API_PREFIX,
  APP_NAME,
  APP_PORT,
  BODY_SIZE_LIMIT,
  SWAGGER_PATH,
} from './app.constant'
import { AppModule } from './app.module'
import { AppValidationPipe } from './app.pipe'

async function bootstrap() {
  // Backend/.env is three levels up from both src/ and dist/.
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

  // Fails before Nest starts, naming every missing variable.
  const config = loadAppConfig()
  const isDevelopment = config.env === AppEnv.development

  const logger: LogLevel[] = isDevelopment
    ? ['log', 'error', 'warn', 'debug']
    : ['error', 'warn']

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Allows any origin. Restrict to known frontends once auth uses cookies. Content-Disposition is exposed so the
    // browser can read an invoice's file name.
    cors: { exposedHeaders: ['Content-Disposition'] },
    logger,
  })

  app.enableVersioning({ type: VersioningType.URI, prefix: API_PREFIX })

  // Nested query objects, e.g. ?filter[category]=ppe&filter[price][max]=50
  app.set('query parser', 'extended')

  app.useBodyParser('json', { limit: BODY_SIZE_LIMIT })
  app.useBodyParser('urlencoded', { limit: BODY_SIZE_LIMIT, extended: true })
  app.use(compression())

  app.useGlobalPipes(new AppValidationPipe())
  app.useGlobalFilters(new AllExceptionsFilter())

  // Lets TypeORM close its connections cleanly on SIGTERM.
  app.enableShutdownHooks()

  app.use(helmet())

  // Product images are public. After helmet, so its headers apply; CORP is relaxed so a
  // frontend on another origin can show them.
  app.useStaticAssets(PRODUCT_IMAGE_DIR, {
    prefix: PRODUCT_IMAGE_URL_PREFIX,
    index: false,
    setHeaders: (res) =>
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })

  // Outside the version prefix and outside any guard.
  app.use('/health', (_req: Request, res: Response) => res.sendStatus(200))

  if (isDevelopment) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('SA Marketplace — Supplier API')
        .setDescription('Seller-facing endpoints')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    )
    SwaggerModule.setup(SWAGGER_PATH, app, document)
  }

  await app.listen(APP_PORT)
  Logger.log(
    `${APP_NAME} listening on http://localhost:${APP_PORT}`,
    'Bootstrap',
  )
}

bootstrap().catch((error: Error) => {
  Logger.error(error.message, error.stack, 'Bootstrap')
  process.exit(1)
})
