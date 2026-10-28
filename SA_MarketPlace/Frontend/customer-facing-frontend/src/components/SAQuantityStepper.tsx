import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, Space } from 'antd'
import { useState } from 'react'
import styled from 'styled-components'
import { usePending } from 'src/hooks/usePending'

interface Props {
  value: number
  /** May return a promise: the stepper shows a spinner and waits until it settles before it can be pressed again. */
  onChange: (value: number) => unknown
  /** Reducing to the minimum (0 by default) is how a card or a line is removed. */
  min?: number
  /** The supplier's stock on hand. */
  max?: number
  disabled?: boolean
  /** Stretch to fill the width, as on a product card. */
  block?: boolean
}

const SAQuantityStepper = ({ value, onChange, min = 0, max, disabled, block }: Props) => {
  const { pending, run } = usePending()
  // Which button was pressed, so only that one shows the spinner.
  const [pressed, setPressed] = useState<'decrease' | 'increase'>()

  const step = (direction: 'decrease' | 'increase') => {
    setPressed(direction)
    return run(() => onChange(direction === 'increase' ? value + 1 : value - 1))
  }

  return (
    <Space.Compact block={block}>
      <Button
        aria-label="Decrease quantity"
        icon={<MinusOutlined />}
        loading={pending && pressed === 'decrease'}
        disabled={disabled || pending || value <= min}
        onClick={() => step('decrease')}
      />
      <Value $block={block} readOnly aria-label="Quantity" value={value} />
      <Button
        aria-label="Increase quantity"
        icon={<PlusOutlined />}
        loading={pending && pressed === 'increase'}
        disabled={disabled || pending || (max !== undefined && value >= max)}
        onClick={() => step('increase')}
      />
    </Space.Compact>
  )
}

export default SAQuantityStepper

const Value = styled(Input)<{ $block?: boolean }>`
  ${({ $block }) => ($block ? 'flex: 1;' : 'width: 56px;')}
  text-align: center;
`
