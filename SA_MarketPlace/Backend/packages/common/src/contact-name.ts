// Signup has one "Contact name", User stores two: the last word is the surname (ADR 0031).
export const splitContactName = (
  contactName: string,
): { firstName: string; lastName: string } => {
  const words = contactName.trim().split(/\s+/)
  return {
    firstName: words.slice(0, -1).join(' '),
    lastName: words[words.length - 1],
  }
}

// The reverse, for pre-filling the form from a stored user.
export const joinContactName = (firstName: string, lastName: string): string =>
  `${firstName} ${lastName}`.trim()
