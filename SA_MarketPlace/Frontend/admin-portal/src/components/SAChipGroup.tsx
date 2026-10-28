import { Button, Flex } from 'antd'
import styled from 'styled-components'

interface Option<T extends string> {
  value: T
  label: string
  /** Shown after the label, such as how many applications are pending. */
  count?: number
}

interface Props<T extends string> {
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Names the group for screen readers. */
  label: string
}

// A row of single-choice filter chips: category, price range and the order status filter. The chosen chip is filled with the primary colour.
function SAChipGroup<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <Flex wrap gap="small" role="group" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Button
            key={option.value}
            type={selected ? 'primary' : 'default'}
            aria-pressed={selected}
            // Spelled out, so the name reads "Pending review 3" and never "Pending review3".
            aria-label={option.count !== undefined ? `${option.label} ${option.count}` : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count !== undefined && <Count>{option.count}</Count>}
          </Button>
        )
      })}
    </Flex>
  )
}

export default SAChipGroup

const Count = styled.span`
  margin-inline-start: ${({ theme }) => theme.marginXXS}px;
  font-variant-numeric: tabular-nums;
`
