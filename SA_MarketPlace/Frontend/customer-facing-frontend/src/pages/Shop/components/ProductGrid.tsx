import { Button, Col, Row } from 'antd'
import ProductCard from 'src/components/ProductCard'
import SAEmpty from 'src/components/SAEmpty'
import type { ProductListItem } from 'src/types'

interface Props {
  products: ProductListItem[]
  /** Units in the cart by product id. */
  quantities: Record<string, number>
  onQuantityChange: (productId: string, quantity: number) => unknown
  onClearFilters: () => void
}

const ProductGrid = ({ products, quantities, onQuantityChange, onClearFilters }: Props) => {
  if (products.length === 0) {
    return (
      <SAEmpty
        title="No products match your search"
        description="Try a different search, or remove some filters."
        action={<Button onClick={onClearFilters}>Clear filters</Button>}
      />
    )
  }

  return (
    <Row gutter={[16, 16]}>
      {products.map((product) => (
        <Col key={product.id} xs={24} sm={12} lg={8} xl={6}>
          <ProductCard
            product={product}
            quantity={quantities[product.id] ?? 0}
            onQuantityChange={(quantity) => onQuantityChange(product.id, quantity)}
          />
        </Col>
      ))}
    </Row>
  )
}

export default ProductGrid
