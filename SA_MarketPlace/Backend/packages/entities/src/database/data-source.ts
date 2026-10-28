import * as path from 'path'
import * as dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import { buildDataSourceOptions } from './database.options'

/**
 * Standalone DataSource for the TypeORM CLI (DATABASE.md §3). Reads env directly: `common` depends on
 * this package, so importing `loadAppConfig` would be circular. Import-time side effects; not in the barrel.
 */

// Backend/.env — four levels up, whether running from src/ via ts-node or dist/.
const ENV_PATH = path.resolve(__dirname, '../../../../.env')
dotenv.config({ path: ENV_PATH })

const REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
] as const

const missing = REQUIRED_KEYS.filter((key) => !process.env[key]?.trim())

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}.\n` +
      `Looked for an env file at: ${ENV_PATH}\n` +
      'Copy Backend/.env.example to Backend/.env and fill these in.',
  )
}

export const dataSourceOptions = buildDataSourceOptions({
  host: process.env.DB_HOST as string,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
  logging: process.env.DB_LOGGING === 'true',
})

/** Exactly ONE DataSource export per file; the CLI counts a named plus default export as two. */
export const AppDataSource = new DataSource(dataSourceOptions)
