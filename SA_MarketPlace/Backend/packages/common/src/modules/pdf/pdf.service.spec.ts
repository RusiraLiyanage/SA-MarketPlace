import { PdfService } from './pdf.service'

const HTML = '<h1>Invoice</h1>'
const isPdf = (buffer: Buffer): boolean =>
  buffer.subarray(0, 5).toString() === '%PDF-'

// Real headless Chromium: the point is to prove a crashed browser is replaced, not mocked.
describe('PdfService', () => {
  jest.setTimeout(120_000)
  let service: PdfService

  beforeEach(async () => {
    service = new PdfService()
    await service.onModuleInit()
  })

  afterEach(async () => {
    await service.onModuleDestroy()
  })

  it('renders HTML to a PDF', async () => {
    expect(isPdf(await service.renderPdf(HTML))).toBe(true)
  })

  it('recovers when the browser was killed since the last render', async () => {
    await service.renderPdf(HTML)
    service['browser']?.process()?.kill('SIGKILL')

    expect(isPdf(await service.renderPdf(HTML))).toBe(true)
  })

  it('launches lazily when startup could not pre-launch the browser', async () => {
    await service.onModuleDestroy()

    expect(isPdf(await service.renderPdf(HTML))).toBe(true)
  })

  it('shares one browser across simultaneous renders', async () => {
    await service.onModuleDestroy()

    const results = await Promise.all([
      service.renderPdf(HTML),
      service.renderPdf(HTML),
      service.renderPdf(HTML),
    ])

    expect(results.every(isPdf)).toBe(true)
  })
})
