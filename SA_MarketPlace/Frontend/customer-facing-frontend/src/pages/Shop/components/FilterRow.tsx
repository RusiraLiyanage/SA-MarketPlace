import type { ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  label: string
  children: ReactNode
}

// One filter: the small upper-case name on the left and its chips beside it, so each filter takes a single line.
const FilterRow = ({ label, children }: Props) => (
  <Row>
    <Label>{label}</Label>
    <Chips>{children}</Chips>
  </Row>
)

export default FilterRow

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.marginSM}px;
`

// A fixed width keeps both rows of chips starting at the same place; as tall as a chip, so the name lines up with the first row when they wrap.
const Label = styled.div`
  flex: 0 0 92px;
  color: ${({ theme }) => theme.colorText};
  font-size: ${({ theme }) => theme.fontSize}px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: ${({ theme }) => theme.controlHeight}px;
  text-transform: uppercase;
`

const Chips = styled.div`
  flex: 1;
  min-width: 0;
`
