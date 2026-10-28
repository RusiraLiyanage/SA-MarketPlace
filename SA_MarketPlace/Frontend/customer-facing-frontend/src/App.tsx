import { App as AntApp, ConfigProvider } from 'antd'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router/dom'
import { router } from 'src/router'
import { store } from 'src/store'
import GlobalStyle from 'src/styles/globalStyles'
import ThemeBridge from 'src/styles/ThemeBridge'
import { theme } from 'src/styles/theme'

// AntApp provides the context for message, notification and modal calls.
const App = () => (
  <Provider store={store}>
    <ConfigProvider theme={theme}>
      <ThemeBridge>
        <GlobalStyle />
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ThemeBridge>
    </ConfigProvider>
  </Provider>
)

export default App
