// The access token lives in sessionStorage: it survives a refresh but not a closed tab, and is not shared between tabs.
// There is no refresh token yet (backend ADR 0045), so the seller signs in again when it expires.
const KEY = 'sa.seller.session.token'

// Storage can throw (blocked, full, private window); the app then simply starts signed out.
export const readStoredToken = (): string | null => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const writeStoredToken = (token: string | null) => {
  try {
    if (token) sessionStorage.setItem(KEY, token)
    else sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to do: the token stays in memory for this page.
  }
}
