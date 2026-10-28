import SAChipGroup from 'src/components/SAChipGroup'
import { PRICE_RANGES, type PriceRange } from 'src/constants'
import FilterRow from 'src/pages/Shop/components/FilterRow'

interface Props {
  /** The chosen range; leave it out for Any price. */
  value?: PriceRange
  onChange: (priceRange: PriceRange | undefined) => void
}

const PriceRangeFilter = ({ value, onChange }: Props) => (
  <FilterRow label="Price">
    <SAChipGroup
      label="Price"
      options={PRICE_RANGES}
      value={value ?? 'any'}
      onChange={(chosen) => onChange(chosen === 'any' ? undefined : chosen)}
    />
  </FilterRow>
)

export default PriceRangeFilter
