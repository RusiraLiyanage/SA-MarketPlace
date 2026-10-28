import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import { Typography } from 'antd'
import styled from 'styled-components'
import type { ReorderLineResult } from 'src/types'

// Before reordering only the name and quantity are known; afterwards each line also says whether it went in.
type Line = Pick<ReorderLineResult, 'productName' | 'requestedQuantity'> & Partial<Pick<ReorderLineResult, 'added' | 'reason'>>

interface Props {
  lines: Line[]
}

const ReorderLines = ({ lines }: Props) => (
  <List aria-label="Items in this order">
    {lines.map(({ productName, requestedQuantity, added, reason }) => (
      <Item key={productName}>
        {added === true && <Added aria-label="Added" />}
        {added === false && <NotAdded aria-label="Not added" />}
        <div>
          <Typography.Text>
            {productName} × {requestedQuantity}
          </Typography.Text>
          {reason && (
            <div>
              <Typography.Text type="secondary">{reason}</Typography.Text>
            </div>
          )}
        </div>
      </Item>
    ))}
  </List>
)

export default ReorderLines

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  margin: ${({ theme }) => theme.margin}px 0 0;
  padding: 0;
  list-style: none;
`

const Item = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.marginXS}px;
`

const Added = styled(CheckCircleFilled)`
  margin-top: 4px;
  color: ${({ theme }) => theme.colorSuccess};
`

const NotAdded = styled(CloseCircleFilled)`
  margin-top: 4px;
  color: ${({ theme }) => theme.colorError};
`
