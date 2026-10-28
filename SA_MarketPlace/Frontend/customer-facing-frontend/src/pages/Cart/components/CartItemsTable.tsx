import { Button, Typography } from 'antd'
import { Link } from 'react-router'
import styled from 'styled-components'
import SAProductImage from 'src/components/SAProductImage'
import SAQuantityStepper from 'src/components/SAQuantityStepper'
import SATable from 'src/components/SATable'
import { PATHS } from 'src/router/paths'
import type { CartItem } from 'src/types'
import { formatCurrency } from 'src/utils/format'

interface Props {
  items: CartItem[]
  onQuantityChange: (productId: string, quantity: number) => unknown
  /** Reducing to 0 or choosing Remove asks first, in a pop-up. */
  onRemove: (productId: string) => void
}

const CartItemsTable = ({ items, onQuantityChange, onRemove }: Props) => (
  <SATable<CartItem>
    rowKey="productId"
    dataSource={items}
    columns={[
      {
        title: 'PRODUCT',
        render: (_, item) => (
          <ProductCell>
            <Thumb>
              <SAProductImage alt={item.name} categorySlug="" />
            </Thumb>
            <div>
              <ProductName to={PATHS.productDetail(item.productId)}>{item.name}</ProductName>
              {item.unavailableReason && (
                <div>
                  <Typography.Text type="danger">{item.unavailableReason}</Typography.Text>
                </div>
              )}
              <RemoveButton type="link" danger size="small" onClick={() => onRemove(item.productId)} aria-label={`Remove ${item.name}`}>
                Remove
              </RemoveButton>
            </div>
          </ProductCell>
        ),
      },
      {
        title: 'QTY',
        align: 'center',
        render: (_, item) => (
          <SAQuantityStepper
            value={item.quantity}
            max={item.stockOnHand}
            disabled={item.unavailableReason !== null}
            onChange={(quantity) => (quantity === 0 ? onRemove(item.productId) : onQuantityChange(item.productId, quantity))}
          />
        ),
      },
      {
        title: 'PRICE',
        dataIndex: 'price',
        align: 'right',
        render: (price: string) => <Typography.Text type="secondary">{formatCurrency(price)}</Typography.Text>,
      },
      {
        title: 'TOTAL',
        dataIndex: 'lineTotal',
        align: 'right',
        render: (total: string, item) => (
          <Typography.Text strong delete={item.unavailableReason !== null}>
            {formatCurrency(total)}
          </Typography.Text>
        ),
      },
    ]}
  />
)

export default CartItemsTable

const ProductCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.margin}px;
`

const Thumb = styled.div`
  flex: none;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius}px;

  > div {
    min-height: 0;
    font-size: 22px;
  }
`

const ProductName = styled(Link)`
  display: block;
  color: ${({ theme }) => theme.colorText};
  font-weight: 500;
`

const RemoveButton = styled(Button)`
  padding-inline: 0;
`
