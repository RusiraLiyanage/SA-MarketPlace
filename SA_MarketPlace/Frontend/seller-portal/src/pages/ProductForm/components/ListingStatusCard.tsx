import { Typography } from 'antd'
import SACard from 'src/components/SACard'
import SAToneTag from 'src/components/SAToneTag'
import { LISTING_STATUS_DISPLAY } from 'src/store/catalogue/selector'
import { ListingStatus } from 'src/store/catalogue/types'

const EXPLANATION = {
  draft: 'Not visible to buyers until you publish. Use Save draft to finish it later.',
  published: 'Visible to buyers on the marketplace and inside Collection Manager. Save draft takes it off sale until you publish again.',
  retired: 'Off sale for good. Retired products are read-only and their SKU stays reserved.',
} as const satisfies Record<ListingStatus, string>

// Where the product stands with buyers, in words.
const ListingStatusCard = ({ status = ListingStatus.draft }: { status?: ListingStatus }) => {
  const { label, tone } = LISTING_STATUS_DISPLAY[status]

  return (
    <SACard title="Listing status">
      <SAToneTag tone={tone}>{label}</SAToneTag>
      <Typography.Paragraph type="secondary">{EXPLANATION[status]}</Typography.Paragraph>
    </SACard>
  )
}

export default ListingStatusCard
