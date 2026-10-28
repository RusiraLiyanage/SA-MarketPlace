import { Button, Typography } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router'
import RowActions from 'src/components/RowActions'
import SAEmpty from 'src/components/SAEmpty'
import SATable from 'src/components/SATable'
import SAToneTag from 'src/components/SAToneTag'
import type { RequestPagination } from 'src/infra/pagination'
import { PATHS } from 'src/router/paths'
import { LISTING_STATUS_DISPLAY, isEditable } from 'src/store/catalogue/selector'
import { ListingStatus, type CatalogueListItem, type CatalogueSortField } from 'src/store/catalogue/types'
import { formatCurrency } from 'src/utils/format'

interface Props {
  products: CatalogueListItem[]
  loading?: boolean
  /** The column the table is sorted by now, so its arrow shows. */
  sortField: CatalogueSortField
  sortOrder: 'ASC' | 'DESC'
  onSortChange: (sort: Pick<RequestPagination, 'orderField' | 'order'>) => void
  /** A search or a status is applied, so an empty table means "nothing matches" rather than "no products yet". */
  filtered?: boolean
  onClearFilters: () => void
}

const sortOrderFor = (column: CatalogueSortField, field: CatalogueSortField, order: 'ASC' | 'DESC') =>
  column === field ? (order === 'ASC' ? ('ascend' as const) : ('descend' as const)) : null

const CatalogueTable = ({ products, loading, sortField, sortOrder, onSortChange, filtered, onClearFilters }: Props) => {
  const navigate = useNavigate()
  const { search } = useLocation()

  return (
    <SATable<CatalogueListItem>
      rowKey="id"
      dataSource={products}
      loading={loading}
      onMetaChange={({ orderField, order }) => onSortChange({ orderField, order })}
      locale={{
        emptyText: filtered ? (
          <SAEmpty
            title="No products match"
            description="Try a different name, SKU or status."
            action={<Button onClick={onClearFilters}>Clear filters</Button>}
          />
        ) : (
          <SAEmpty
            title="No products listed yet"
            description="Add your first product to start selling on the marketplace and inside Collection Manager."
            action={
              <Button type="primary" onClick={() => navigate(PATHS.newProduct)}>
                + Add product
              </Button>
            }
          />
        ),
      }}
      columns={[
        {
          title: 'PRODUCT NAME',
          dataIndex: 'name',
          sorter: true,
          sortOrder: sortOrderFor('name', sortField, sortOrder),
          render: (name: string, { listingStatus }) =>
            listingStatus === ListingStatus.retired ? <Typography.Text type="secondary">{name}</Typography.Text> : <strong>{name}</strong>,
        },
        { title: 'SKU', dataIndex: 'sku', render: (sku: string) => <Typography.Text type="secondary">{sku}</Typography.Text> },
        {
          title: 'PRICE (GST INCL.)',
          dataIndex: 'price',
          sorter: true,
          sortOrder: sortOrderFor('price', sortField, sortOrder),
          render: (price: string) => formatCurrency(price),
        },
        {
          title: 'STOCK',
          dataIndex: 'quantity',
          sorter: true,
          sortOrder: sortOrderFor('quantity', sortField, sortOrder),
          render: (quantity: number) => quantity,
        },
        {
          title: 'STATUS',
          dataIndex: 'listingStatus',
          render: (status: ListingStatus) => {
            const { label, tone } = LISTING_STATUS_DISPLAY[status]
            return <SAToneTag tone={tone}>{label}</SAToneTag>
          },
        },
        {
          title: 'ACTIONS',
          key: 'actions',
          render: (_, { id, name, listingStatus }) =>
            isEditable(listingStatus) ? (
              <RowActions>
                <Link to={PATHS.editProduct(id)} aria-label={`Edit ${name}`}>
                  Edit
                </Link>
                <Button type="link" danger // The list's query goes along, so the pop-up can name the product and closing returns to the same view.
                  onClick={() => navigate({ pathname: PATHS.retireProduct(id), search })} aria-label={`Retire ${name}`}>
                  Retire
                </Button>
              </RowActions>
            ) : (
              <RowActions>
                <Link to={PATHS.editProduct(id)} aria-label={`View ${name}`}>
                  View
                </Link>
                <Typography.Text type="secondary">Read-only</Typography.Text>
              </RowActions>
            ),
        },
      ]}
    />
  )
}

export default CatalogueTable
