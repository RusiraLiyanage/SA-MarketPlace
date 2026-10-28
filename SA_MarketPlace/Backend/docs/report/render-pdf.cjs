// Renders report.html to PDF with the repo's own Chromium. Run from Backend/ after pnpm install:
//   node docs/report/render-pdf.cjs
const path = require('path')
const { pathToFileURL } = require('url')
;(async () => {
  const entry = require.resolve('puppeteer', {
    paths: [path.resolve(__dirname, '../../packages/common')],
  })
  const puppeteer = (await import(pathToFileURL(entry).href)).default
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.goto('file://' + path.resolve(__dirname, 'report.html'), { waitUntil: 'load' })
  await page.pdf({
    path: path.resolve(__dirname, 'SA-Marketplace-Delivery-Report.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#6b7280;padding:0 16mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif"><span>SA Marketplace — Delivery Report</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
  })
  await browser.close()
})()
