// Injection token for the options passed to AuthCoreModule.register().
export const AUTH_OPTIONS = 'AUTH_OPTIONS'

export const ROLES_KEY = 'roles'

// Rate limit for login and sign-up, per IP. Overridable so tests can tighten or
// loosen it: AUTH_THROTTLE_LIMIT requests per AUTH_THROTTLE_TTL seconds.
export const AUTH_THROTTLE_LIMIT = 5
export const AUTH_THROTTLE_TTL_SECONDS = 60

// Short on purpose: a one-time recovery link.
// Overridable via PASSWORD_RESET_TOKEN_TTL_MINUTES.
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30

// The "aud" claim. A token only works on the surface that issued it.
export enum AuthAudience {
  customer = 'customer',
  supplier = 'supplier',
  admin = 'admin',
}
