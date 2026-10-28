import { Input } from 'antd'
import { useId, type ReactNode } from 'react'
import SAFormItem from 'src/components/SAFormItem'

interface Props {
  label: string
  value: string
  extra?: ReactNode
  /** Greyed out (the default) for what the seller cannot change; read-only for a value they can still select. */
  disabled?: boolean
}

// A value shown in a box like the editable ones. Its label is tied to the box, which a form item without a field name does not do by itself.
const ReadOnlyField = ({ label, value, extra, disabled = true }: Props) => {
  const id = useId()

  return (
    <SAFormItem label={label} htmlFor={id} extra={extra}>
      <Input id={id} value={value} disabled={disabled} readOnly />
    </SAFormItem>
  )
}

export default ReadOnlyField
