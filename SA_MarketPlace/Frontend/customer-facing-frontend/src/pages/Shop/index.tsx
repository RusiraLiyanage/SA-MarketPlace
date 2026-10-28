import { Flex } from 'antd'
import { Outlet } from 'react-router'
import styled from 'styled-components'
import SALoadError from 'src/components/SALoadError'
import SAPagination from 'src/components/SAPagination'
import SASkeleton from 'src/components/SASkeleton'
import CategoryFilter from 'src/pages/Shop/components/CategoryFilter'
import HeroSearchBanner from 'src/pages/Shop/components/HeroSearchBanner'
import PriceRangeFilter from 'src/pages/Shop/components/PriceRangeFilter'
import ProductGrid from 'src/pages/Shop/components/ProductGrid'
import ProductResultsHeader from 'src/pages/Shop/components/ProductResultsHeader'
import SortSelect from 'src/pages/Shop/components/SortSelect'
import { useShopQuery } from 'src/pages/Shop/useShopQuery'
import { toProductsRequest } from 'src/pages/Shop/shopQuery'
import { useCartActions } from 'src/store/cart/actions'
import { useCartQuantities } from 'src/store/cart/selector'
import { useGetCategoriesQuery, useListProductsQuery } from 'src/store/products/actions'

const ShopPage = () => {
  const { query, update, clear } = useShopQuery()

  // `data` keeps the previous results while a new filter loads, so the grid dims instead of flashing empty.
  const { data: products, error, isLoading, isFetching, refetch } = useListProductsQuery(toProductsRequest(query))
  const { data: categories = [] } = useGetCategoriesQuery()
  const quantities = useCartQuantities()
  const { setQuantity } = useCartActions()

  return (
    <>
      <HeroSearchBanner value={query.search} onSearch={(search) => update({ search })} />
      <Content>
        <CategoryFilter
          categories={categories}
          value={query.categoryId}
          onChange={(categoryId) => update({ categoryId })}
        />
        <Flex justify="space-between" align="flex-end" gap="middle" wrap>
          <PriceRangeFilter value={query.priceRange} onChange={(priceRange) => update({ priceRange })} />
          <SortSelect value={query.sort} onChange={(sort) => update({ sort })} />
        </Flex>
        {isLoading ? (
          <SASkeleton rows={8} />
        ) : !products ? (
          <SALoadError what="the products" error={error} onRetry={refetch} />
        ) : (
          <Results $busy={isFetching} aria-busy={isFetching}>
            <ProductResultsHeader total={products.pagingMeta.totalItem} />
            <ProductGrid
              products={products.data}
              quantities={quantities}
              onQuantityChange={setQuantity}
              onClearFilters={clear}
            />
            <SAPagination meta={products.pagingMeta} onChange={(page, limit) => update({ page, limit })} />
          </Results>
        )}
      </Content>
      <Outlet />
    </>
  )
}

export default ShopPage

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.paddingMD}px ${({ theme }) => theme.paddingLG}px;
`

const Results = styled.div<{ $busy: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginLG}px;
  opacity: ${({ $busy }) => ($busy ? 0.6 : 1)};
  transition: opacity 0.15s;
`
