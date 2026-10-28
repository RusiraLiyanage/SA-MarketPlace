import SAToneTag from 'src/components/SAToneTag'
import { ORDER_STATUS_DISPLAY } from 'src/store/orders/selector'
import type { SellerOrderStatus } from 'src/store/orders/types'

// An order's status as a coloured tag; the same words and colours in the table and on the order.
const SAOrderStatusTag = ({ status }: { status: SellerOrderStatus }) => {
  const { label, tone } = ORDER_STATUS_DISPLAY[status]
  return <SAToneTag tone={tone}>{label}</SAToneTag>
}

export default SAOrderStatusTag
