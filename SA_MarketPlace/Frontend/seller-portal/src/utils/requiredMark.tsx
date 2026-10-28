import type { ReactNode } from 'react'

// The designs put the asterisk after the label ("Email address *"), not before it as Ant Design does.
export const requiredMarkAfter = (label: ReactNode, { required }: { required: boolean }): ReactNode => (
  <>
    {label}
    {required && ' *'}
  </>
)
