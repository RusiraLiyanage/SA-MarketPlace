import { useParams } from 'react-router'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SASkeleton from 'src/components/SASkeleton'
import { ERROR_CODE, isApiError } from 'src/infra/errors'
import ProductFormView from 'src/pages/ProductForm/components/ProductFormView'
import { useGetCategoriesQuery, useGetProductQuery } from 'src/store/catalogue/actions'

// Add product (no id in the address) and Edit product (`/catalogue/:productId`) are the same form; this loads what it needs.
const ProductFormPage = () => {
  const { productId } = useParams()
  const categories = useGetCategoriesQuery()
  const product = useGetProductQuery(productId ?? '', { skip: !productId })
  const title = productId ? 'Edit product' : 'Add product'

  if (categories.isLoading || product.isLoading) {
    return (
      <>
        <SAPageHeader title={title} />
        <SASkeleton rows={10} />
      </>
    )
  }

  if (productId && !product.data) {
    // 404 is a product that is not this seller's or does not exist; 400 is an address that is not even a product id.
    const notFound = isApiError(product.error) && (product.error.code === ERROR_CODE.notFound || product.error.code === ERROR_CODE.badRequest)
    return (
      <>
        <SAPageHeader title={title} />
        {notFound ? (
          <SAEmpty title="Product not found" description="It may belong to another seller, or the link is wrong." />
        ) : (
          <SALoadError what="this product" error={product.error} onRetry={product.refetch} />
        )}
      </>
    )
  }

  if (!categories.data) {
    return (
      <>
        <SAPageHeader title={title} />
        <SALoadError what="the categories" error={categories.error} onRetry={categories.refetch} />
      </>
    )
  }

  // Keyed by product, so the form of one product never carries over to the next.
  return <ProductFormView key={product.data?.id ?? 'new'} product={product.data} categories={categories.data} />
}

export default ProductFormPage
