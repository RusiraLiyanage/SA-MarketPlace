import { Typography } from 'antd'
import { useParams } from 'react-router'
import styled from 'styled-components'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SASkeleton from 'src/components/SASkeleton'
import { isApiError } from 'src/infra/errors'
import ProductGallery from 'src/pages/ProductDetail/components/ProductGallery'
import ProductInfo from 'src/pages/ProductDetail/components/ProductInfo'
import ProductSpecifications from 'src/pages/ProductDetail/components/ProductSpecifications'
import RelatedProducts from 'src/pages/ProductDetail/components/RelatedProducts'
import SupplierCard from 'src/pages/ProductDetail/components/SupplierCard'
import { usePageCrumbs } from 'src/router/pageMeta'
import { PATHS } from 'src/router/paths'
import { useCartActions } from 'src/store/cart/actions'
import { useCartQuantities } from 'src/store/cart/selector'
import { useGetProductQuery } from 'src/store/products/actions'
import { useRelatedProducts } from 'src/store/products/selector'
import { SASectionTitle } from 'src/components/SATitle'

const ProductDetailPage = () => {
  const { productId = '' } = useParams()
  const { data: product, error, isLoading, refetch } = useGetProductQuery(productId)
  const { products: related } = useRelatedProducts(product)

  const quantities = useCartQuantities()
  const { setQuantity } = useCartActions()

  usePageCrumbs(
    product && [{ title: product.category.name, to: PATHS.shopByCategory(product.category.id) }, { title: product.name }],
  )

  if (isLoading) {
    return (
      <Page>
        <SASkeleton rows={10} />
      </Page>
    )
  }

  if (!product) {
    // 404 is a product that is retired, hidden or never existed; 400 is a link that is not even a product id. Neither
    // is worth retrying.
    const notFound = isApiError(error) && (error.status === 404 || error.status === 400)
    return (
      <Page>
        {notFound ? (
          <SAEmpty title="Product not found" description="It may have been retired, or the link is wrong." />
        ) : (
          <SALoadError what="this product" error={error} onRetry={refetch} />
        )}
      </Page>
    )
  }

  return (
    <Page>
      <Overview>
        <ProductGallery key={product.id} product={product} />
        <Details>
          <ProductInfo
            key={product.id}
            product={product}
            inCart={quantities[product.id] ?? 0}
            onQuantityChange={(quantity) => setQuantity(product.id, quantity)}
          />
          <SupplierCard supplierName={product.supplierName} />
        </Details>
      </Overview>

      {product.description && (
        <section>
          <SASectionTitle>Product description</SASectionTitle>
          <Typography.Paragraph>{product.description}</Typography.Paragraph>
        </section>
      )}

      <ProductSpecifications product={product} />
      <RelatedProducts
        products={related}
        quantities={quantities}
        onQuantityChange={setQuantity}
      />
    </Page>
  )
}

export default ProductDetailPage

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginLG}px;
  padding: ${({ theme }) => theme.paddingMD}px ${({ theme }) => theme.paddingLG}px;
`

const Overview = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
  gap: ${({ theme }) => theme.marginLG}px;
`

const Details = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginMD}px;
`
