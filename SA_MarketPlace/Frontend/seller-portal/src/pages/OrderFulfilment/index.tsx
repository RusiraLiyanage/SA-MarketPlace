import { useState } from 'react'
import { Outlet, useParams } from 'react-router'
import styled from 'styled-components'
import DownloadInvoiceButton from 'src/components/DownloadInvoiceButton'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SASkeleton from 'src/components/SASkeleton'
import DispatchPanel from 'src/pages/OrderFulfilment/components/DispatchPanel'
import FulfilmentProgress from 'src/pages/OrderFulfilment/components/FulfilmentProgress'
import OrderSummary from 'src/pages/OrderFulfilment/components/OrderSummary'
import PickList from 'src/pages/OrderFulfilment/components/PickList'
import { ERROR_CODE, isApiError } from 'src/infra/errors'
import { useGetOrderQuery } from 'src/store/orders/actions'
import { lineKey } from 'src/store/orders/selector'
import { SellerOrderStatus, type OrderDetail } from 'src/store/orders/types'
import { formatDate } from 'src/utils/format'

const OrderFulfilmentPage = () => {
  const { orderNumber = '' } = useParams()
  const { data: order, error, isLoading, refetch } = useGetOrderQuery(orderNumber)

  if (isLoading) {
    return (
      <>
        <SAPageHeader title={`Order ${orderNumber}`} />
        <SASkeleton rows={8} />
      </>
    )
  }

  if (!order) {
    // 404 is an order that is not this seller's or does not exist; 400 is a number that is not even an order number.
    const notFound = isApiError(error) && (error.code === ERROR_CODE.notFound || error.code === ERROR_CODE.badRequest)
    return (
      <>
        <SAPageHeader title={`Order ${orderNumber}`} />
        {notFound ? (
          <SAEmpty title="Order not found" description="It may belong to another seller, or the link is wrong." />
        ) : (
          <SALoadError what="this order" error={error} onRetry={refetch} />
        )}
      </>
    )
  }

  // Keyed by order, so the ticks of one order never carry over to the next.
  return <OrderView key={order.orderNumber} order={order} />
}

export default OrderFulfilmentPage

const OrderView = ({ order }: { order: OrderDetail }) => {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const toggle = (key: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  const pickAll = () => setPicked(new Set(order.items.map(lineKey)))

  const mode = order.canDispatch ? 'pick' : order.status === SellerOrderStatus.cancelled ? 'plain' : 'packed'

  return (
    <>
      <SAPageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`Placed ${formatDate(order.placedAt)} by ${order.organisationName ?? 'a buyer with no organisation'}`}
        extra={<DownloadInvoiceButton orderNumber={order.orderNumber} available={order.canDownloadInvoice} type="default" size="large" />}
      />
      <FulfilmentProgress order={order} />
      <Columns>
        <Left>
          <OrderSummary order={order} />
          <PickList lines={order.items} mode={mode} picked={picked} onToggle={toggle} onMarkAll={pickAll} />
        </Left>
        <DispatchPanel order={order} pickedCount={order.items.filter((line) => picked.has(lineKey(line))).length} />
      </Columns>
      <Outlet />
    </>
  )
}

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: ${({ theme }) => theme.margin}px;
  align-items: start;
`

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
`
