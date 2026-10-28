// One-off helper for real email (ADR 0046): signs you in to Google in the browser, then writes GOOGLE_REFRESH_TOKEN and
// MAIL_FROM_ADDRESS into Backend/.env. Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET there first.
//
//   node scripts/google-refresh-token.mjs
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../.env')
const PORT = 53682
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`
// Gmail sending, plus the address of whoever signs in so the sender needs no typing.
const SCOPES = 'https://mail.google.com/ openid email'

const readEnv = () => readFileSync(ENV_PATH, 'utf8')
const valueOf = (env, key) =>
  new RegExp(`^${key}=(.*)$`, 'm').exec(env)?.[1]?.trim()

const setValue = (env, key, value) =>
  new RegExp(`^${key}=.*$`, 'm').test(env)
    ? env.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`)
    : `${env.trimEnd()}\n${key}=${value}\n`

const env = readEnv()
const clientId = valueOf(env, 'GOOGLE_CLIENT_ID')
const clientSecret = valueOf(env, 'GOOGLE_CLIENT_SECRET')
if (!clientId || !clientSecret) {
  console.error(
    'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Backend/.env first.',
  )
  process.exit(1)
}

const state = randomBytes(16).toString('hex')
const consentUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    // Offline access with a forced consent screen, or Google may not hand back a refresh token.
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

// The page Google sends the browser back to; it carries the one-time code.
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', REDIRECT_URI)
  if (url.pathname !== '/callback') {
    response.writeHead(404).end()
    return
  }

  const finish = (status, message) => {
    response
      .writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end(message)
    server.close()
  }

  if (url.searchParams.get('state') !== state)
    return finish(400, 'Wrong state. Run the script again.')
  const code = url.searchParams.get('code')
  if (!code)
    return finish(
      400,
      `Google did not approve: ${url.searchParams.get('error') ?? 'no code'}.`,
    )

  const reply = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await reply.json()
  if (!tokens.refresh_token) {
    console.error(
      'Google sent no refresh token:',
      tokens.error_description ?? tokens.error ?? 'unknown reason',
    )
    return finish(500, 'No refresh token. See the terminal.')
  }

  const address = JSON.parse(
    Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString(),
  ).email
  let updated = setValue(
    readEnv(),
    'GOOGLE_REFRESH_TOKEN',
    tokens.refresh_token,
  )
  updated = setValue(updated, 'MAIL_FROM_ADDRESS', address)
  writeFileSync(ENV_PATH, updated)

  console.log(
    `Done. Emails will be sent from ${address}. Restart the API to use them.`,
  )
  finish(
    200,
    `Done. You can close this tab. Emails will be sent from ${address}.`,
  )
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    'Open this address, sign in with the Gmail account that should send the emails, and allow access:\n',
  )
  console.log(consentUrl.toString(), '\n')
  console.log(
    `(If Google says redirect_uri_mismatch, add ${REDIRECT_URI} to the OAuth client's authorised redirect URIs.)`,
  )
})
