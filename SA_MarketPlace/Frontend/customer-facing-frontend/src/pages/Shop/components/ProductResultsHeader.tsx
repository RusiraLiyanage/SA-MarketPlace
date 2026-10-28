import { Typography } from 'antd'
import { pluralise } from 'src/utils/format'

const ProductResultsHeader = ({ total }: { total: number }) => (
  <Typography.Text type="secondary">{pluralise(total, 'product')}</Typography.Text>
)

export default ProductResultsHeader
