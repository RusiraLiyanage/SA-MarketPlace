import { App as AntApp, ConfigProvider } from 'antd'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import type { AppStore } from 'src/store'
import ThemeBridge from 'src/styles/ThemeBridge'
import { theme } from 'src/styles/theme'

// What App.tsx wraps the app in, for tests: the store, the Ant Design theme and its message context.
const TestProviders = ({ store, children }: { store: AppStore; children: ReactNode }) => (
  <Provider store={store}>
    <ConfigProvider theme={theme}>
      <ThemeBridge>
        <AntApp>{children}</AntApp>
      </ThemeBridge>
    </ConfigProvider>
  </Provider>
)

export default TestProviders
