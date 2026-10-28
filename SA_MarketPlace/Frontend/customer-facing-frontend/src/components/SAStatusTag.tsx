import SAToneTag from 'src/components/SAToneTag'
import { ORDER_STATUS_DISPLAY } from 'src/constants'
import type { OrderStatus } from 'src/types'

const SAStatusTag = ({ status }: { status: OrderStatus }) => {
  const { label, tone } = ORDER_STATUS_DISPLAY[status]
  return <SAToneTag tone={tone}>{label}</SAToneTag>
}

export default SAStatusTag
