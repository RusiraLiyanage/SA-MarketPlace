import type { ReactNode } from 'react'
import styled from 'styled-components'
import SACard from 'src/components/SACard'

export interface DetailRow {
  label: string
  value: ReactNode
}

// A titled card of facts: the label on the left, the value on the right, one row each.
const DetailsCard = ({ title, rows }: { title: string; rows: DetailRow[] }) => (
  <SACard title={title}>
    <Rows>
      {rows.map(({ label, value }) => (
        <Row key={label}>
          <Label>{label}</Label>
          <Value>{value}</Value>
        </Row>
      ))}
    </Rows>
  </SACard>
)

export default DetailsCard

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
  overflow-wrap: anywhere;
`
