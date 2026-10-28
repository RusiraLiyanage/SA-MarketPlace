// The invoice document: a pure function returning HTML, kept apart from rendering/storage.

export interface InvoiceTemplateItem {
  productName: string
  sku: string
  quantity: number
  /** GST-inclusive, as a string (ADR 0008) — same as everywhere else in the app. */
  unitPrice: string
  lineTotal: string
}

export interface InvoiceTemplateData {
  invoiceNumber: string
  issuedAt: Date
  orderNumber: string
  sellerBusinessName: string
  sellerAbn: string
  buyerOrganisationName: string
  buyerAddress: string
  items: InvoiceTemplateItem[]
  subtotal: string
  gstTotal: string
  total: string
}

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  }).format(date)

// Escapes stored free text (organisation/business names) before it reaches the HTML.
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export function renderInvoiceHtml(data: InvoiceTemplateData): string {
  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td class="mono">${escapeHtml(item.sku)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">$${item.unitPrice}</td>
          <td class="num">$${item.lineTotal}</td>
        </tr>`,
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Tax Invoice ${escapeHtml(data.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #262626;
    font-size: 13px;
  }
  .mono { font-family: ui-monospace, "SFMono-Regular", Consolas, monospace; }
  .page { padding: 8px; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 2px solid #1677FF;
  }
  .brand { font-size: 20px; font-weight: 700; color: #1677FF; }
  .brand-sub { font-size: 11px; color: #8C8C8C; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 {
    margin: 0; font-size: 18px; letter-spacing: 0.06em; font-weight: 700;
  }
  .doc-meta { margin-top: 6px; font-size: 12px; color: #595959; }
  .doc-meta div { margin-top: 2px; }
  .parties {
    display: flex; justify-content: space-between; gap: 32px; margin-top: 28px;
  }
  .party { flex: 1; }
  .party h2 {
    margin: 0 0 8px 0; font-size: 10px; letter-spacing: 0.08em;
    text-transform: uppercase; color: #8C8C8C; font-weight: 600;
  }
  .party .name { font-size: 14px; font-weight: 600; }
  .party .line { margin-top: 4px; color: #595959; white-space: pre-line; }
  table {
    width: 100%; border-collapse: collapse; margin-top: 28px;
  }
  thead th {
    text-align: left; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
    color: #8C8C8C; font-weight: 600; padding: 8px 6px; border-bottom: 1px solid #D9D9D9;
  }
  tbody td { padding: 10px 6px; border-bottom: 1px solid #F0F0F0; font-size: 13px; }
  .num { text-align: right; }
  .totals {
    width: 260px; margin-left: auto; margin-top: 16px;
  }
  .totals .row {
    display: flex; justify-content: space-between; padding: 6px 6px;
    font-size: 13px;
  }
  .totals .row.total {
    border-top: 1px solid #D9D9D9; margin-top: 4px; padding-top: 10px;
    font-size: 15px; font-weight: 700;
  }
  .footer {
    margin-top: 48px; padding-top: 16px; border-top: 1px solid #F0F0F0;
    font-size: 10px; color: #8C8C8C; line-height: 1.5;
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="brand">SA Marketplace</div>
      <div class="brand-sub">A Sample Assist product</div>
    </div>
    <div class="doc-title">
      <h1>TAX INVOICE</h1>
      <div class="doc-meta">
        <div>Invoice ${escapeHtml(data.invoiceNumber)}</div>
        <div>${formatDate(data.issuedAt)}</div>
        <div>Order ${escapeHtml(data.orderNumber)}</div>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h2>From</h2>
      <div class="name">${escapeHtml(data.sellerBusinessName)}</div>
      <div class="line">ABN ${escapeHtml(data.sellerAbn)}</div>
    </div>
    <div class="party">
      <h2>To</h2>
      <div class="name">${escapeHtml(data.buyerOrganisationName)}</div>
      <div class="line">${escapeHtml(data.buyerAddress)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>SKU</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <div>Subtotal</div>
      <div>$${data.subtotal}</div>
    </div>
    <div class="row">
      <div>GST</div>
      <div>$${data.gstTotal}</div>
    </div>
    <div class="row total">
      <div>Total</div>
      <div>$${data.total}</div>
    </div>
  </div>

  <div class="footer">
    This is a tax invoice issued under the A New Tax System (Goods and Services Tax) Act 1999.
    Prices are in Australian dollars and include GST where applicable.
  </div>

</div>
</body>
</html>`
}
