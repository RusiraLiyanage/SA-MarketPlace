// Writes every email template to an HTML file so its look can be checked in a browser: pnpm mail:preview
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resetPasswordEmail } from '../packages/common/dist/index.js'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'storage', 'mail-preview')
mkdirSync(outDir, { recursive: true })

const previews = {
  'reset-password': resetPasswordEmail({
    firstName: 'Jordan',
    resetLink: 'http://localhost:5173/reset-password?token=0123456789abcdef0123456789abcdef',
    ttlMinutes: 30,
    supportEmail: 'partners@sampleassist.com.au',
  }),
}

for (const [name, { html }] of Object.entries(previews)) {
  const file = join(outDir, `${name}.html`)
  writeFileSync(file, html)
  console.log(file)
}
