/** Anything a person typed (a name, a link) is escaped before it goes into HTML. */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
