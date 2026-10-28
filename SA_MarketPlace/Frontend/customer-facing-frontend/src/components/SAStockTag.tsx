import SAToneTag from 'src/components/SAToneTag'
import { STOCK_STATUS_DISPLAY } from 'src/constants'
import type { StockStatus } from 'src/types'

const SAStockTag = ({ status }: { status: StockStatus }) => {
  const { label, tone } = STOCK_STATUS_DISPLAY[status]
  return <SAToneTag tone={tone}>{label}</SAToneTag>
}

export default SAStockTag
