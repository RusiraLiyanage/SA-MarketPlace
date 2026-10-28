// Where admin sign-up is allowed from when ADMIN_EMAIL_DOMAINS is not set.
export const DEFAULT_ADMIN_EMAIL_DOMAINS = 'sampleassist.com.au'

// "a.com, B.com" becomes ["a.com", "b.com"]; blanks are dropped.
export const parseEmailDomains = (configured: string): string[] =>
  configured
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => domain !== '')

// An exact match on the part after the last "@". Never "ends with": that would let
// "evil-sampleassist.com.au" or "sampleassist.com.au.evil.com" through.
export const isAllowedAdminEmail = (
  email: string,
  allowedDomains: string[],
): boolean => {
  const normalised = email.trim().toLowerCase()
  const at = normalised.lastIndexOf('@')
  if (at < 1) {
    return false
  }
  return allowedDomains.includes(normalised.slice(at + 1))
}
