import { Select } from 'antd'
import { SORT_OPTIONS, type SortKey } from 'src/constants'

interface Props {
  value: SortKey
  onChange: (sort: SortKey) => void
}

const SortSelect = ({ value, onChange }: Props) => (
  <Select<SortKey>
    aria-label="Sort"
    prefix="Sort:"
    value={value}
    options={SORT_OPTIONS.map(({ value: key, label }) => ({ value: key, label }))}
    onChange={onChange}
    style={{ minWidth: 220 }}
  />
)

export default SortSelect
