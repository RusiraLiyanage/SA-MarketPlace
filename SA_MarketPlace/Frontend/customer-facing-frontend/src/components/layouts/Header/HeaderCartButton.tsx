import { ShoppingCartOutlined } from '@ant-design/icons'
import { Badge, Button } from 'antd'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'
import { useCartCount } from 'src/store/cart/selector'
import { pluralise } from 'src/utils/format'

// The badge is the number of units in the cart, as the cart summary counts them. It shows 0 too, so the cart is never an unlabelled icon.
const HeaderCartButton = () => {
  const navigate = useNavigate()
  const count = useCartCount()

  return (
    <CartButton
      type="text"
      size="large"
      icon={
        <Badge count={count} showZero overflowCount={99} color={count > 0 ? undefined : 'gray'}>
          <ShoppingCartOutlined />
        </Badge>
      }
      aria-label={`Cart, ${pluralise(count, 'item')}`}
      onClick={() => navigate(PATHS.cart)}
    />
  )
}

export default HeaderCartButton

const CartButton = styled(Button)`
  .ant-btn-icon,
  .ant-btn-icon .anticon {
    font-size: 26px;
  }

  .ant-badge-count {
    font-size: ${({ theme }) => theme.fontSizeSM}px;
    font-weight: 700;
  }
`
