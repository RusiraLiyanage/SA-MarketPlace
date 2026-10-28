import { DeleteOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { Outlet, useNavigate } from 'react-router'
import styled from 'styled-components'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SASkeleton from 'src/components/SASkeleton'
import OrderSummaryCard from 'src/components/OrderSummaryCard'
import PageLayout from 'src/components/layouts/PageLayout'
import CartItemsTable from 'src/pages/Cart/components/CartItemsTable'
import type { CartOutletContext } from 'src/pages/Cart/cartOutletContext'
import { PATHS } from 'src/router/paths'
import { useCartActions, useGetCartQuery } from 'src/store/cart/actions'
import { pluralise } from 'src/utils/format'

const CartPage = () => {
  const navigate = useNavigate()
  const { data: cart, error, isLoading, refetch } = useGetCartQuery()
  const { setQuantity, remove, clear } = useCartActions()

  if (isLoading) {
    return (
      <PageLayout title="Shopping cart">
        <SASkeleton rows={6} />
      </PageLayout>
    )
  }

  if (!cart) {
    return (
      <PageLayout title="Shopping cart">
        <SALoadError what="your cart" error={error} onRetry={refetch} />
      </PageLayout>
    )
  }

  const { items, summary } = cart
  const suppliers = new Set(items.map((item) => item.supplierProfileId)).size
  const canCheckout = items.some((item) => item.unavailableReason === null)

  const context: CartOutletContext = { items, onRemove: remove, onClear: clear }

  if (items.length === 0) {
    return (
      <PageLayout title="Shopping cart">
        <SAEmpty
          title="Your cart is empty"
          description="Add something from the shop and it will appear here."
          action={
            <Button type="primary" onClick={() => navigate(PATHS.shop)}>
              Browse the shop
            </Button>
          }
        />
        <Outlet context={context} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Shopping cart"
      subtitle={`${pluralise(summary.itemCount, 'item')} from ${pluralise(suppliers, 'supplier')}`}
    >
      <Layout>
        <Items>
          <ClearCart danger icon={<DeleteOutlined />} onClick={() => navigate(PATHS.clearCart)}>
            Clear cart
          </ClearCart>
          <CartItemsTable
            items={items}
            onQuantityChange={setQuantity}
            onRemove={(productId) => navigate(PATHS.removeCartItem(productId))}
          />
        </Items>
        <OrderSummaryCard summary={summary}>
          <Button type="primary" size="large" block disabled={!canCheckout} onClick={() => navigate(PATHS.checkoutDelivery)}>
            Proceed to checkout
          </Button>
          <Button size="large" block onClick={() => navigate(PATHS.shop)}>
            Continue shopping
          </Button>
        </OrderSummaryCard>
      </Layout>
      <Outlet context={context} />
    </PageLayout>
  )
}

export default CartPage

const Items = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
`

const ClearCart = styled(Button)`
  align-self: flex-end;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: ${({ theme }) => theme.marginLG}px;
  align-items: start;
`
