import { DownloadOutlined } from '@ant-design/icons'
import { App, Button } from 'antd'
import { getErrorMessage } from 'src/infra/errors'
import { useExportOrdersMutation } from 'src/store/orders/actions'
import type { OrdersFilter } from 'src/store/orders/types'

// Saves what the table shows (its filters and sort, every page) as a CSV file. The backend refuses an export that is too big before
// sending anything; its message says so, and narrowing the filters is the way round it.
const ExportCsvButton = ({ filter }: { filter: OrdersFilter }) => {
  const { message } = App.useApp()
  const [exportOrders, { isLoading }] = useExportOrdersMutation()

  const save = async () => {
    try {
      const filename = await exportOrders(filter).unwrap()
      message.success(`Saved ${filename}`)
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  return (
    <Button size="large" icon={<DownloadOutlined aria-hidden />} loading={isLoading} onClick={save}>
      Export CSV
    </Button>
  )
}

export default ExportCsvButton
