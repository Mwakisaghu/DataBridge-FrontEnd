import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { App as AntApp, ConfigProvider, Layout } from 'antd'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ControlCentre from './pages/ControlCentre'
import Intake from './pages/Intake'
import SetupPage from './pages/Setup'
import Audit from './pages/Audit'
import { theme } from './theme'

const { Content } = Layout

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntApp>
        <BrowserRouter>
          <Layout style={{ minHeight: '100vh' }}>
            <Sidebar />
            <Layout>
              <TopBar />
              <Content>
                <Routes>
                  <Route path="/" element={<ControlCentre />} />
                  <Route path="/intake" element={<Intake />} />
                  <Route path="/setup" element={<SetupPage />} />
                  <Route path="/audit" element={<Audit />} />
                  {/* Old addresses from the first prototype */}
                  <Route path="/validations" element={<Navigate to="/intake" replace />} />
                  <Route path="/logs" element={<Navigate to="/audit" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Content>
            </Layout>
          </Layout>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
