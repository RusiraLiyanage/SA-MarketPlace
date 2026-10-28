import { loadAppConfig } from './app.config'
import { AppEnv } from '../constant'

const validEnv = {
  NODE_ENV: AppEnv.development,
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'sa_marketplace',
  DB_LOGGING: 'true',
  JWT_SECRET: 'test-secret',
}

describe('loadAppConfig', () => {
  it('returns a typed config from a complete environment', () => {
    const config = loadAppConfig(validEnv)

    expect(config.env).toBe(AppEnv.development)
    expect(config.database.port).toBe(5432)
    expect(config.database.name).toBe('sa_marketplace')
  })

  it('names every missing key in a single error', () => {
    const incomplete: Partial<typeof validEnv> = { ...validEnv }
    delete incomplete.DB_HOST
    delete incomplete.DB_PASSWORD

    expect(() => loadAppConfig(incomplete)).toThrow(/DB_HOST/)
    expect(() => loadAppConfig(incomplete)).toThrow(/DB_PASSWORD/)
  })

  it('treats a blank value as missing', () => {
    expect(() => loadAppConfig({ ...validEnv, DB_HOST: '   ' })).toThrow(
      /DB_HOST/,
    )
  })

  it.each([
    ['missing', undefined],
    ['blank', '  '],
  ])('rejects a %s JWT_SECRET', (_label, value) => {
    const env: Partial<typeof validEnv> = { ...validEnv }
    if (value === undefined) {
      delete env.JWT_SECRET
    } else {
      env.JWT_SECRET = value
    }

    expect(() => loadAppConfig(env)).toThrow(/JWT_SECRET/)
  })

  it('rejects an unknown NODE_ENV', () => {
    expect(() =>
      loadAppConfig({ ...validEnv, NODE_ENV: 'production' }),
    ).toThrow(/NODE_ENV/)
  })

  it('defaults DB_LOGGING to false when absent', () => {
    const withoutLogging: Partial<typeof validEnv> = { ...validEnv }
    delete withoutLogging.DB_LOGGING

    expect(loadAppConfig(withoutLogging).database.logging).toBe(false)
  })

  it('rejects a non-numeric DB_PORT', () => {
    expect(() =>
      loadAppConfig({ ...validEnv, DB_PORT: 'five thousand' }),
    ).toThrow(/DB_PORT/)
  })
})
