import * as path from 'path'
import { DataSourceOptions } from 'typeorm'
import { SaNamingStrategy } from './naming.strategy'
import { ALL_ENTITIES } from '../entities/all-entities'

/**
 * Single definition of the Postgres connection (DATABASE.md §3), shared by the CLI and the Nest apps.
 * Side-effect free: reads no env and loads no .env.
 */
export interface DatabaseConnectionParams {
  host: string
  port: number
  username: string
  password: string
  database: string
  logging: boolean
}

export const buildDataSourceOptions = (
  params: DatabaseConnectionParams,
): DataSourceOptions => ({
  type: 'postgres',

  // Default would emit uuid_generate_v4() (uuid-ossp); 'pgcrypto' matches our gen_random_uuid() migrations.
  uuidExtension: 'pgcrypto',

  host: params.host,
  port: params.port,
  username: params.username,
  password: params.password,
  database: params.database,
  logging: params.logging,

  // Never true: schema comes from migrations only (DATABASE.md §1.2); synchronize drops unknown columns.
  synchronize: false,

  // Migrations never run on boot, so a deploy can't half-migrate a database.
  migrationsRun: false,

  namingStrategy: new SaNamingStrategy(),

  // Both entry points inherit whatever is set here, so the two can never drift apart.
  entities: ALL_ENTITIES,

  migrations: [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')],
})
