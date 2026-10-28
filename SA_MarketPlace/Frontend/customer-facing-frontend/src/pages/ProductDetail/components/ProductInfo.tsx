import { Typography } from 'antd'
import styled from 'styled-components'
import AddToCartControl from 'src/components/ProductCard/AddToCartControl'
import SAStockTag from 'src/components/SAStockTag'
import type { ProductDetail } from 'src/types'
import { formatCurrency } from 'src/utils/format'

interface Props {
  product: ProductDetail
  /** How many of this product are in the cart; 0 means none. */
  inCart: number
  /** The first unit is an add, and 0 takes the product out again. */
  onQuantityChange: (quantity: number) => unknown
}

// The same control as the product cards: a plain Add to cart button until the product is really in the cart, then the stepper.
const ProductInfo = ({ product, inCart, onQuantityChange }: Props) => (
  <Info>
    <Category>{product.category.name}</Category>
    <Title level={1}>{product.name}</Title>
    <Meta>
      <Typography.Text type="secondary">SKU: {product.sku}</Typography.Text>
      <span>Sold by {product.supplierName}</span>
      <SAStockTag status={product.stockStatus} />
    </Meta>
    <div>
      <Price>{formatCurrency(product.price)}</Price>
      <Typography.Text type="secondary"> GST inclusive · per unit</Typography.Text>
    </div>
    <AddToCartControl stockStatus={product.stockStatus} quantity={inCart} onQuantityChange={onQuantityChange} />
  </Info>
)

export default ProductInfo

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
`

const Category = styled.div`
  color: ${({ theme }) => theme.colorTextSecondary};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const Title = styled(Typography.Title)`
  && {
    margin: 0;
    font-size: ${({ theme }) => theme.fontSizeHeading3}px;
    line-height: ${({ theme }) => theme.lineHeightHeading3};
  }
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.marginMD}px;
`

const Price = styled.span`
  font-size: ${({ theme }) => theme.fontSizeHeading3}px;
  font-weight: 700;
`
