// Input cleaning for class-transformer's @Transform, shared by the seller DTOs.

export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value

// Multipart forms send an empty input as "": treat it as not sent.
export const trimToUndefined = ({ value }: { value: unknown }): unknown => {
  const trimmed = trim({ value })
  return trimmed === '' ? undefined : trimmed
}

// Update: a blank means "clear it", so it becomes null. Not sent stays undefined.
export const trimToNull = ({ value }: { value: unknown }): unknown => {
  const trimmed = trim({ value })
  return trimmed === '' ? null : trimmed
}
