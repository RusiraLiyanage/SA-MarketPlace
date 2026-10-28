import { SearchOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import styled from 'styled-components'
import SAChipGroup from 'src/components/SAChipGroup'
import { CATALOGUE_STATUS_FILTERS } from 'src/constants'
import type { CatalogueStatusFilter } from 'src/pages/Catalogue/catalogueQuery'

interface Props {
  search: string
  status: CatalogueStatusFilter
  onSearch: (search: string) => void
  onStatusChange: (status: CatalogueStatusFilter) => void
}

const CatalogueFilters = ({ search, status, onSearch, onStatusChange }: Props) => (
  <Filters>
    <Input
      // Re-mounts when the URL's search changes (for example "Clear filters"), so the box shows it.
      key={search}
      type="search"
      allowClear
      defaultValue={search}
      prefix={<SearchOutlined />}
      placeholder="Search products..."
      aria-label="Search products"
      maxLength={100}
      onPressEnter={(event) => onSearch(event.currentTarget.value.trim())}
      onChange={(event) => {
        // The clear button empties the box; searching again is not needed for that.
        if (event.target.value === '' && search !== '') onSearch('')
      }}
    />
    <SAChipGroup label="Listing status" options={CATALOGUE_STATUS_FILTERS} value={status} onChange={onStatusChange} />
  </Filters>
)

export default CatalogueFilters

const Filters = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.margin}px;

  .ant-input-affix-wrapper {
    width: 300px;
  }

  input[type='search']::-webkit-search-cancel-button {
    display: none;
  }
`
