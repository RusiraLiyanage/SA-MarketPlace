import { Typography } from 'antd'
import { Link } from 'react-router'
import styled from 'styled-components'
import AddToCartControl from 'src/components/ProductCard/AddToCartControl'
import SAProductImage from 'src/components/SAProductImage'
import SAStockTag from 'src/components/SAStockTag'
import SAToneTag from 'src/components/SAToneTag'
import { mediaUrl } from 'src/infra/http'
import { PATHS } from 'src/router/paths'
import type { ProductListItem } from 'src/types'
import { formatCurrency } from 'src/utils/format'

interface Props {
  product: ProductListItem
  /** How many are in the cart; 0 means none. */
  quantity: number
  onQuantityChange: (quantity: number) => unknown
  /** The short card under "You may also like": no supplier, stock tag or Verified badge. */
  compact?: boolean
}

// Shown in the catalogue and under "You may also like" on a product page.
const ProductCard = ({ product, quantity, onQuantityChange, compact }: Props) => (
  <Card $inCart={quantity > 0}>
    {/* The name below links to the same page, so the picture is left out of the tab order and the reading order. */}
    <Media $compact={compact} to={PATHS.productDetail(product.id)} aria-hidden tabIndex={-1}>
      <SAProductImage
        alt={product.name}
        categorySlug={product.category.slug}
        imageUrl={product.primaryImage ? mediaUrl(product.primaryImage.path) : undefined}
      />
      {!compact && (
        <Verified>
          <SAToneTag tone="info">Verified</SAToneTag>
        </Verified>
      )}
    </Media>
    <Body>
      <Name to={PATHS.productDetail(product.id)}>{product.name}</Name>
      {!compact && <Typography.Text type="secondary">Sold by {product.supplierName}</Typography.Text>}
      <Price>{formatCurrency(product.price)}</Price>
      {!compact && (
        <div>
          <SAStockTag status={product.stockStatus} />
        </div>
      )}
      <Action>
        <AddToCartControl
          compact={compact}
          stockStatus={product.stockStatus}
          quantity={quantity}
          onQuantityChange={onQuantityChange}
        />
      </Action>
    </Body>
  </Card>
)

export default ProductCard

const Card = styled.article<{ $inCart: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.colorBgContainer};
  border: 1px solid ${({ $inCart, theme }) => ($inCart ? theme.colorPrimary : 'transparent')};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Media = styled(Link)<{ $compact?: boolean }>`
  position: relative;
  display: block;
  height: ${({ $compact }) => ($compact ? 112 : 160)}px;
`

const Verified = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.marginXS}px;
  left: ${({ theme }) => theme.marginXS}px;

  .ant-tag {
    margin: 0;
  }
`

const Body = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginXXS}px;
  padding: ${({ theme }) => theme.padding}px;
`

// Pinned to the bottom so the buttons line up across a row of cards. The space sits here, not on the button, so its label stays centred.
const Action = styled.div`
  margin-top: auto;
  padding-top: ${({ theme }) => theme.paddingXS}px;
`

const Name = styled(Link)`
  color: ${({ theme }) => theme.colorText};
  font-weight: 600;
`

const Price = styled.span`
  font-size: ${({ theme }) => theme.fontSizeHeading4}px;
  font-weight: 600;
`
