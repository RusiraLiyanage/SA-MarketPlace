import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import type { Browser, PaperFormat, PDFMargin } from 'puppeteer'

export interface RenderPdfOptions {
  format?: PaperFormat
  margin?: PDFMargin
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
}

const DEFAULT_MARGIN: PDFMargin = {
  top: '20mm',
  right: '16mm',
  bottom: '20mm',
  left: '16mm',
}

// puppeteer is ESM-only but this monorepo compiles to CommonJS; `new Function` keeps a real
// runtime import() that TypeScript won't downlevel to require().
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<typeof import('puppeteer')>

// Each render step gives up after this long, so a hung Chromium becomes an error we can recover from.
const RENDER_TIMEOUT_MS = 30_000
const BROWSER_CLOSE_TIMEOUT_MS = 5_000

/**
 * HTML -> PDF buffer via headless Chromium. One shared browser per process (launch costs ~1s), one page per render.
 * The browser is relaunched whenever it is missing, disconnected or hung, so a crash never leaves invoices failing.
 */
@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name)
  private browser: Browser | null = null
  // Concurrent renders share one launch instead of starting several Chromiums.
  private launching: Promise<Browser> | null = null

  async onModuleInit(): Promise<void> {
    // Pre-warm only: a failed launch must not stop the app booting, the first render retries.
    try {
      await this.getBrowser()
    } catch (error) {
      this.logger.error(`Could not pre-launch Chromium: ${String(error)}`)
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.discardBrowser()
  }

  async renderPdf(html: string, options?: RenderPdfOptions): Promise<Buffer> {
    try {
      return await this.render(html, options)
    } catch (error) {
      // A crashed or hung Chromium is the usual cause: start a clean one and try once more.
      this.logger.warn(
        `PDF render failed (${String(
          error,
        )}); relaunching Chromium and retrying once`,
      )
      await this.discardBrowser()
      return await this.render(html, options)
    }
  }

  private async render(
    html: string,
    options?: RenderPdfOptions,
  ): Promise<Buffer> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()
    try {
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: RENDER_TIMEOUT_MS,
      })
      // Puppeteer strips background colours and images from print output by default.
      await page.emulateMediaType('print')

      const buffer = await page.pdf({
        format: options?.format ?? 'A4',
        margin: options?.margin ?? DEFAULT_MARGIN,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: options?.displayHeaderFooter ?? false,
        headerTemplate: options?.headerTemplate,
        footerTemplate: options?.footerTemplate,
        timeout: RENDER_TIMEOUT_MS,
      })
      return Buffer.from(buffer)
    } finally {
      // Close the page, never the browser. If the browser is already gone, do not hide the real error.
      await page.close().catch(() => undefined)
    }
  }

  private getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return Promise.resolve(this.browser)
    }

    this.launching ??= this.launch()
      .then((browser) => {
        browser.on('disconnected' as never, () => {
          if (this.browser === browser) {
            this.browser = null
          }
        })
        this.browser = browser
        return browser
      })
      .finally(() => {
        this.launching = null
      })
    return this.launching
  }

  // Closes politely, then kills the process so a hung Chromium cannot linger.
  private async discardBrowser(): Promise<void> {
    const browser = this.browser
    this.browser = null
    if (!browser) {
      return
    }

    const child = browser.process()
    let timer: NodeJS.Timeout | undefined
    await Promise.race([
      browser.close().catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, BROWSER_CLOSE_TIMEOUT_MS)
      }),
    ])
    clearTimeout(timer)
    child?.kill('SIGKILL')
  }

  private async launch(): Promise<Browser> {
    const puppeteer = (await importEsm('puppeteer')).default
    return puppeteer.launch({
      headless: true,
      // Required in most CI/Docker sandboxes; harmless locally.
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
}
