import { Button, Typography } from 'antd'
import styled from 'styled-components'
import type { OrderStatus } from 'src/types'

interface Props {
  status: OrderStatus
  downloading?: boolean
  onDownloadInvoice: () => void
  onReorder: () => void
}

// The invoice is issued once the supplier has dispatched, so the button says why it is off before then.
const canDownloadInvoice = (status: OrderStatus) => status === 'dispatched' || status === 'delivered'

const OrderActions = ({ status, downloading, onDownloadInvoice, onReorder }: Props) => {
  const invoiceReady = canDownloadInvoice(status)

  return (
    <Actions>
      <Buttons>
        <Button size="large" disabled={!invoiceReady} loading={downloading} onClick={onDownloadInvoice}>
          Download invoice
        </Button>
        <Button type="primary" size="large" onClick={onReorder}>
          Reorder
        </Button>
      </Buttons>
      {!invoiceReady && <Typography.Text type="secondary">The invoice is available once the order is dispatched.</Typography.Text>}
    </Actions>
  )
}

export default OrderActions

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.marginXXS}px;
`

const Buttons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.marginSM}px;
`
