import type { GlobalToken } from 'antd'
import 'styled-components'

// styled-components read the Ant Design tokens, e.g. ${({ theme }) => theme.colorPrimary}.
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends GlobalToken {}
}
