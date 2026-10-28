import { AppEnv } from '../constant'

export interface DatabaseConfig {
  host: string
  port: number
  username: string
  password: string
  name: string
  /** Echo SQL to the console. Useful locally, noisy everywhere else. */
  logging: boolean
}

export interface AppConfig {
  env: AppEnv
  database: DatabaseConfig
}

/** Keys that must be present; anything else needs a default below. */
const REQUIRED_KEYS = [
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  // Signs access tokens. Blank is rejected here; ConfigService.getOrThrow would not.
  'JWT_SECRET',
] as const

type EnvSource = Record<string, string | undefined>

const toInt = (key: string, value: string): number => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Environment variable ${key} must be a positive integer, got "${value}"`,
    )
  }
  return parsed
}

const toBool = (value: string | undefined, fallback = false): boolean =>
  value === undefined ? fallback : value.trim().toLowerCase() === 'true'

/** Reads and validates env config at boot so a missing var fails fast, by name (DATABASE.md §3, §4). */
export const loadAppConfig = (source: EnvSource = process.env): AppConfig => {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]?.trim())

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill these in.',
    )
  }

  const env = source.NODE_ENV as AppEnv
  if (!Object.values(AppEnv).includes(env)) {
    throw new Error(
      `NODE_ENV must be one of: ${Object.values(AppEnv).join(', ')}. Got "${
        source.NODE_ENV
      }".`,
    )
  }

  return Object.freeze({
    env,
    database: Object.freeze({
      host: source.DB_HOST as string,
      port: toInt('DB_PORT', source.DB_PORT as string),
      username: source.DB_USERNAME as string,
      password: source.DB_PASSWORD as string,
      name: source.DB_NAME as string,
      logging: toBool(source.DB_LOGGING),
    }),
  })
}
