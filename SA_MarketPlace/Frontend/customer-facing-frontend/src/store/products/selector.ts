import { useListProductsQuery } from 'src/store/products/actions'
import type { ProductDetail, ProductListItem } from 'src/types'

const RELATED_COUNT = 4

/**
 * "You may also like": products of the same category first, topped up from the rest of the catalogue when the category
 * is small. There is no related-products endpoint (decided for Phase 1), so this uses the list twice at most.
 */
export const useRelatedProducts = (product: Pick<ProductDetail, 'id' | 'category'> | undefined) => {
  // One more than needed, since the product itself is among its category's results.
  const sameCategory = useListProductsQuery(
    { categoryId: product?.category.id, limit: RELATED_COUNT + 1 },
    { skip: !product },
  )
  const fromCategory = (sameCategory.data?.data ?? []).filter(({ id }) => id !== product?.id).slice(0, RELATED_COUNT)

  const needsTopUp = sameCategory.isSuccess && fromCategory.length < RELATED_COUNT
  const rest = useListProductsQuery({ limit: RELATED_COUNT * 2 }, { skip: !needsTopUp })
  const topUp = (rest.data?.data ?? []).filter(({ id }) => id !== product?.id && !fromCategory.some((p) => p.id === id))

  const products: ProductListItem[] = [...fromCategory, ...topUp].slice(0, RELATED_COUNT)
  return { products, isLoading: sameCategory.isLoading || rest.isLoading }
}
