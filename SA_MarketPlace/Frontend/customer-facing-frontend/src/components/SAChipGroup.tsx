import { Button, Flex } from 'antd'

interface Option<T extends string> {
  value: T
  label: string
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
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </Flex>
  )
}

export default SAChipGroup
