import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { setupStore, type AppStore } from 'src/store'
import TestProviders from 'src/test/TestProviders'

// Renders with the same store, Ant Design theme and styled-components bridge the app uses.
export const renderWithTheme = (ui: ReactElement, store: AppStore = setupStore()) =>
  render(<TestProviders store={store}>{ui}</TestProviders>)
