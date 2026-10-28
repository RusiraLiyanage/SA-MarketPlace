import type { ReactNode } from 'react'
import styled from 'styled-components'

export interface DetailRow {
  label: string
  value: ReactNode
}

// Label on the left, value on the right, one row each: the card under the title on every application screen.
const DetailsCard = ({ rows, children }: { rows: DetailRow[]; children?: ReactNode }) => (
  <Card>
    {children}
    <Rows>
      {rows.map(({ label, value }) => (
        <Row key={label}>
          <Label>{label}</Label>
          <Value>{value}</Value>
        </Row>
      ))}
    </Rows>
  </Card>
)

export default DetailsCard

const Card = styled.div`
  width: 100%;
  margin-top: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
  text-align: left;
`

const Rows = styled.dl`
  margin: 0;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
  padding: ${({ theme }) => theme.paddingSM}px 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colorBorderSecondary};
  }
`

const Label = styled.dt`
  color: ${({ theme }) => theme.colorTextSecondary};
`

const Value = styled.dd`
  margin: 0;
  font-weight: 600;
  text-align: right;
`
