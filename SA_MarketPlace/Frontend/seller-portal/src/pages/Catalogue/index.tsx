import { PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Typography } from 'antd'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SAPagination from 'src/components/SAPagination'
import SASkeleton from 'src/components/SASkeleton'
import CatalogueFilters from 'src/pages/Catalogue/components/CatalogueFilters'
import CatalogueTable from 'src/pages/Catalogue/components/CatalogueTable'
import LowStockBanner from 'src/pages/Catalogue/components/LowStockBanner'
import type { CatalogueOutletContext } from 'src/pages/Catalogue/catalogueOutletContext'
import { hasCatalogueFilter, toCatalogueRequest } from 'src/pages/Catalogue/catalogueQuery'
import { useCatalogueQuery } from 'src/pages/Catalogue/useCatalogueQuery'
import { PATHS } from 'src/router/paths'
import { useListCatalogueQuery } from 'src/store/catalogue/actions'

const CataloguePage = () => {
  const navigate = useNavigate()
  // Set by the retire pop-up, which sends the seller to the Retired tab with the product's name.
  const retired = (useLocation().state as { retired?: string } | null)?.retired
  const [dismissed, setDismissed] = useState(false)
  const { query, update, clear } = useCatalogueQuery()
  // `data` keeps the previous results while a new filter loads, so the table dims instead of flashing empty.
  const { data: catalogue, error, isLoading, isFetching, refetch } = useListCatalogueQuery(toCatalogueRequest(query))
  const filtered = hasCatalogueFilter(query)
  const nothingListed = catalogue !== undefined && !filtered && catalogue.pagingMeta.totalItem === 0
  const context: CatalogueOutletContext = { products: catalogue?.data ?? [] }

  return (
    <>
      <SAPageHeader
        title="Catalogue management"
        extra={
          !nothingListed && (
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate(PATHS.newProduct)}>
              Add product
            </Button>
          )
        }
      />
      {retired && !dismissed && (
        <Alert
          closable={{ onClose: () => setDismissed(true) }}
          showIcon
          type="success"
          title={`${retired} has been retired. It is no longer visible to buyers.`}
        />
      )}
      {catalogue && <LowStockBanner lowStock={catalogue.lowStock} />}
      {!nothingListed && (
        <CatalogueFilters
          search={query.search}
          status={query.status}
          onSearch={(search) => update({ search })}
          onStatusChange={(status) => update({ status })}
        />
      )}
      {isLoading ? (
        <SASkeleton rows={6} />
      ) : !catalogue ? (
        <SALoadError what="your catalogue" error={error} onRetry={refetch} />
      ) : (
        <>
          <CatalogueTable
            products={catalogue.data}
            loading={isFetching}
            sortField={query.orderField}
            sortOrder={query.order}
            onSortChange={({ orderField, order }) =>
              update(orderField && order ? { orderField: orderField as typeof query.orderField, order } : { orderField: 'name', order: 'ASC' })
            }
            filtered={filtered}
            onClearFilters={clear}
          />
          {catalogue.pagingMeta.totalItem > 0 && (
            <SAPagination meta={catalogue.pagingMeta} onChange={(page, limit) => update({ page, limit })} />
          )}
          <Typography.Text type="secondary">
            {query.status === 'retired'
              ? 'Retired products are read-only and never appear to buyers. Their SKUs stay reserved, and orders already placed are not affected.'
              : 'Prices and stock levels update immediately once saved — there is no confirmation step from Sample Assist.'}
          </Typography.Text>
        </>
      )}
      <Outlet context={context} />
    </>
  )
}

export default CataloguePage
