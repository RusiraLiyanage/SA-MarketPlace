/** Matches NODE_ENV. Local-only for now (CLAUDE.md §2), so no staging/production member. */
export enum AppEnv {
  development = 'development',
  test = 'test',
}

/** Pagination bounds; the page sizes offered to users: 10, 20 or 30 (CLAUDE.md §6). */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 30,
  PAGE_SIZE_OPTIONS: [10, 20, 30],
} as const

/** Days a carrier needs after dispatch; added to the estimate at checkout and at dispatch. */
export const TRANSIT_DAYS = 3

export const ACCESS_TOKEN_LIFE_TIME = 1000 * 60 * 15 // 15 minutes
export const REFRESH_TOKEN_LIFE_TIME = 1000 * 60 * 60 * 24 * 14 // 14 days

export const PATTERNS = {
  /** At least 8 chars, one lowercase, one uppercase, one digit, one symbol. */
  PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'<>.^*()%_!-])[A-Za-z\d@$&+,:_;=?@#|'<>.^*()%!-]{8,}$/,
}
