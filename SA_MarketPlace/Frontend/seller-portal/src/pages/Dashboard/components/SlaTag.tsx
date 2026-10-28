import SAToneTag from 'src/components/SAToneTag'
import { slaBadge } from 'src/store/dashboard/selector'

// How long a seller has left to dispatch an order, as a coloured badge.
const SlaTag = ({ hoursLeft }: { hoursLeft: number }) => {
  const { label, tone } = slaBadge(hoursLeft)
  return <SAToneTag tone={tone}>{label}</SAToneTag>
}

export default SlaTag
