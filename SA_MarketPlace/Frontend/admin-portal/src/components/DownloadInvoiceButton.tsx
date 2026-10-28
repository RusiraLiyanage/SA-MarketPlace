import { DownloadOutlined } from '@ant-design/icons'
import { App, Button, Tooltip } from 'antd'
import { getErrorMessage } from 'src/infra/errors'
import { useDownloadInvoiceMutation } from 'src/store/orders/actions'

interface Props {
  orderNumber: string
  /** The backend's `canDownloadInvoice`: an invoice exists only once the order has dispatched. */
  available: boolean
  /** Why there is no invoice, shown when the button is off. */
  unavailableReason?: string
}

// Saves the order's tax invoice. When there is none the button is off and says why.
const DownloadInvoiceButton = ({ orderNumber, available, unavailableReason = 'Available once the order is dispatched' }: Props) => {
  const { message } = App.useApp()
  const [download, { isLoading }] = useDownloadInvoiceMutation()

  const save = async () => {
    try {
      await download(orderNumber).unwrap()
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const button = (
    <Button size="large" icon={<DownloadOutlined aria-hidden />} loading={isLoading} disabled={!available} onClick={save}>
      Download invoice
    </Button>
  )

  // A disabled button does not show a tooltip itself, so the tip sits on a wrapper.
  return available ? button : <Tooltip title={unavailableReason}><span>{button}</span></Tooltip>
}

export default DownloadInvoiceButton
