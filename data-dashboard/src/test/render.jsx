import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import store from '../redux/store'
import { theme } from '../theme'

/** Renders a page the way the app does: store, router, antd theme and message context. */
export function renderPage(ui, { route = '/' } = {}) {
  return render(
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <AntApp>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </AntApp>
      </ConfigProvider>
    </Provider>,
  )
}
