import { Empty, Typography } from 'antd'
import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  action?: ReactNode
}

const SAEmpty = ({ title, description, action }: Props) => (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description={
      <>
        <Typography.Text strong>{title}</Typography.Text>
        {description && (
          <div>
            <Typography.Text type="secondary">{description}</Typography.Text>
          </div>
        )}
      </>
    }
  >
    {action}
  </Empty>
)

export default SAEmpty
