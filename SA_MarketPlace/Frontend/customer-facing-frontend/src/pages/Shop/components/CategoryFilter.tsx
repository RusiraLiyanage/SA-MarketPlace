import SAChipGroup from 'src/components/SAChipGroup'
import FilterRow from 'src/pages/Shop/components/FilterRow'
import type { CategoryOption } from 'src/types'

const ALL = 'all'

interface Props {
  categories: CategoryOption[]
  /** The chosen category's id; leave it out for All. */
  value?: string
  onChange: (categoryId: string | undefined) => void
}

const CategoryFilter = ({ categories, value, onChange }: Props) => (
  <FilterRow label="Category">
    <SAChipGroup
      label="Category"
      options={[{ value: ALL, label: 'All' }, ...categories.map(({ id, name }) => ({ value: id, label: name }))]}
      value={value ?? ALL}
      onChange={(chosen) => onChange(chosen === ALL ? undefined : chosen)}
    />
  </FilterRow>
)

export default CategoryFilter
