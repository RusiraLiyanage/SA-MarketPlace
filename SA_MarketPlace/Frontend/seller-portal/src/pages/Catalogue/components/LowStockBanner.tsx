import { Alert } from 'antd'
import { lowStockMessage } from 'src/store/catalogue/selector'
import type { LowStockProduct } from 'src/store/catalogue/types'

// Above the table on every tab: published products at or below their threshold. The backend's list ignores the filters, so
// the warning shows whichever tab the seller is on.
const LowStockBanner = ({ lowStock }: { lowStock: LowStockProduct[] }) => {
  const message = lowStockMessage(lowStock)
  if (!message) return null

  return (
    <Alert
      showIcon
      type="warning"
      title={message.title}
      description={message.items && <ul>{message.items.map((item) => <li key={item}>{item}</li>)}</ul>}
    />
  )
}

export default LowStockBanner
