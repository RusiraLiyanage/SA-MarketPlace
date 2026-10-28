import { App, Button, Tooltip, type ButtonProps } from 'antd'
import { getErrorMessage } from 'src/infra/errors'
import { useDownloadInvoiceMutation } from 'src/store/orders/actions'

interface Props {
  orderNumber: string
  /** The backend's `canDownloadInvoice`: an invoice exists only once the order has dispatched. */
  available: boolean
  type?: ButtonProps['type']
  size?: ButtonProps['size']
}

// Saves the order's tax invoice. Before dispatch there is none, so the button is off and says why.
const DownloadInvoiceButton = ({ orderNumber, available, type = 'link', size }: Props) => {
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
    <Button type={type} size={size} loading={isLoading} disabled={!available} onClick={save}>
      Download invoice
    </Button>
  )

  // A disabled button does not show a tooltip itself, so the tip sits on a wrapper.
  return available ? button : <Tooltip title="Available once the order is dispatched"><span>{button}</span></Tooltip>
}

export default DownloadInvoiceButton
