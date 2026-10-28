// Hands a file the browser has fetched to the buyer, as a download.
export const saveFile = (blob: Blob, filename: string) => {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
}

// `attachment; filename="INV-2026-00001.pdf"` gives "INV-2026-00001.pdf".
export const filenameFrom = (contentDisposition: string | null | undefined, fallback: string): string =>
  /filename="?([^";]+)"?/.exec(contentDisposition ?? '')?.[1] ?? fallback
