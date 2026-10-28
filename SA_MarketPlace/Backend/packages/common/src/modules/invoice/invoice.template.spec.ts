import { InvoiceTemplateData, renderInvoiceHtml } from './invoice.template'

const baseData: InvoiceTemplateData = {
  invoiceNumber: 'INV-2026-00001',
  issuedAt: new Date('2026-08-14T01:41:00.000Z'),
  orderNumber: 'ORD-2026-00123',
  sellerBusinessName: 'Bindi MedSupply Pty Ltd',
  sellerAbn: '51824753556',
  buyerOrganisationName: 'Safety Corp',
  buyerAddress: '3 Compliance Court, Macquarie Park NSW 2113',
  items: [
    {
      productName: 'Chain of Custody Forms (50pk)',
      sku: 'COC-004',
      quantity: 5,
      unitPrice: '12.00',
      lineTotal: '60.00',
    },
  ],
  subtotal: '54.55',
  gstTotal: '5.45',
  total: '60.00',
}

describe('renderInvoiceHtml', () => {
  it('includes the invoice and order identifiers', () => {
    const html = renderInvoiceHtml(baseData)

    expect(html).toContain('INV-2026-00001')
    expect(html).toContain('ORD-2026-00123')
  })

  it('includes the seller and buyer details', () => {
    const html = renderInvoiceHtml(baseData)

    expect(html).toContain('Bindi MedSupply Pty Ltd')
    expect(html).toContain('51824753556')
    expect(html).toContain('Safety Corp')
    expect(html).toContain('3 Compliance Court, Macquarie Park NSW 2113')
  })

  it('includes every item line, priced', () => {
    const html = renderInvoiceHtml(baseData)

    expect(html).toContain('Chain of Custody Forms (50pk)')
    expect(html).toContain('COC-004')
    expect(html).toContain('$12.00')
    expect(html).toContain('$60.00')
  })

  it('renders one row per item', () => {
    const html = renderInvoiceHtml({
      ...baseData,
      items: [
        ...baseData.items,
        {
          productName: 'Disposable Nitrile Gloves (100pk)',
          sku: 'NGL-007',
          quantity: 2,
          unitPrice: '15.50',
          lineTotal: '31.00',
        },
      ],
    })

    expect(html).toContain('Chain of Custody Forms (50pk)')
    expect(html).toContain('Disposable Nitrile Gloves (100pk)')
    // One <tr> per item, plus one for the table's own header row.
    expect(html.match(/<tr>/g)).toHaveLength(3)
  })

  it('includes subtotal, GST and total', () => {
    const html = renderInvoiceHtml(baseData)

    expect(html).toContain('$54.55')
    expect(html).toContain('$5.45')
    expect(html).toContain('$60.00')
  })

  it('formats the issued date in Australian day-month-year style', () => {
    const html = renderInvoiceHtml(baseData)

    expect(html).toContain('14 Aug 2026')
  })

  it('escapes HTML in free-text fields instead of injecting it raw', () => {
    const html = renderInvoiceHtml({
      ...baseData,
      sellerBusinessName: '<script>alert(1)</script>',
      buyerOrganisationName: 'Tom & Jerry\'s "Supplies"',
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('Tom &amp; Jerry&#39;s &quot;Supplies&quot;')
  })
})
