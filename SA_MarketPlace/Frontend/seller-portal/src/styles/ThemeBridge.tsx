import { theme as antdTheme } from 'antd'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'

// Hands the active Ant Design tokens to styled-components so both read from one theme.
const ThemeBridge = ({ children }: { children: ReactNode }) => {
  const { token } = antdTheme.useToken()
  return <ThemeProvider theme={token}>{children}</ThemeProvider>
}

export default ThemeBridge
