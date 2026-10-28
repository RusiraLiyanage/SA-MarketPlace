import { Col, Row } from 'antd'
import styled from 'styled-components'
import ProductCard from 'src/components/ProductCard'
import type { ProductListItem } from 'src/types'
import { SASectionTitle } from 'src/components/SATitle'

interface Props {
  products: ProductListItem[]
  /** Units in the cart by product id. */
  quantities: Record<string, number>
  onQuantityChange: (productId: string, quantity: number) => unknown
}

const RelatedProducts = ({ products, quantities, onQuantityChange }: Props) => {
  if (products.length === 0) return null

  return (
    <section>
      <Heading>You may also like</Heading>
      <Row gutter={[16, 16]}>
        {products.map((product) => (
          <Col key={product.id} xs={24} sm={12} lg={6}>
            <ProductCard
              compact
              product={product}
              quantity={quantities[product.id] ?? 0}
              onQuantityChange={(quantity) => onQuantityChange(product.id, quantity)}
            />
          </Col>
        ))}
      </Row>
    </section>
  )
}

export default RelatedProducts

const Heading = styled(SASectionTitle)`
  && {
    margin-bottom: ${({ theme }) => theme.marginSM}px;
  }
`
