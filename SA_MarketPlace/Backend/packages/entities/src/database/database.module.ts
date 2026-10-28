import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { buildDataSourceOptions } from './database.options'

/**
 * Database entry point for the running Nest apps (DATABASE.md §3); the CLI uses `data-source.ts`.
 * Config comes via ConfigService (forRootAsync), not process.env, so tests can override it.
 */
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) =>
            buildDataSourceOptions({
              host: config.getOrThrow<string>('DB_HOST'),
              port: Number(config.getOrThrow<string>('DB_PORT')),
              username: config.getOrThrow<string>('DB_USERNAME'),
              password: config.getOrThrow<string>('DB_PASSWORD'),
              database: config.getOrThrow<string>('DB_NAME'),
              logging: config.get<string>('DB_LOGGING') === 'true',
            }),
        }),
      ],
      exports: [TypeOrmModule],
    }
  }
}
