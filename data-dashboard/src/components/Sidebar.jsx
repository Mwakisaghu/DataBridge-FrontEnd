import { useState } from 'react'
import { Layout, Menu, Tooltip } from 'antd'
import {
  ApartmentOutlined,
  AuditOutlined,
  CloudUploadOutlined,
  ClearOutlined,
  ControlOutlined,
  DeploymentUnitOutlined,
  ReconciliationOutlined,
} from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import { colors } from '../theme'

const { Sider } = Layout

// The six DataBridge modules. Modules not built yet are listed so the roadmap is visible.
const modules = [
  { key: '/', n: 1, label: 'Control Centre', icon: <ApartmentOutlined /> },
  { key: '/intake', n: 2, label: 'Intake & validation', icon: <CloudUploadOutlined /> },
  { key: 'cleaning', n: 3, label: 'Cleaning', icon: <ClearOutlined />, later: 'Phase 3' },
  { key: 'reconciliation', n: 4, label: 'Reconciliation', icon: <ReconciliationOutlined />, later: 'Phase 2' },
  { key: 'integration', n: 5, label: 'Integration', icon: <DeploymentUnitOutlined />, later: 'Phase 4' },
  { key: '/audit', n: 6, label: 'Audit & retention', icon: <AuditOutlined /> },
]

function selectedKey(pathname) {
  if (pathname.startsWith('/intake') || pathname.startsWith('/checks')) return '/intake'
  if (pathname.startsWith('/audit')) return '/audit'
  if (pathname.startsWith('/setup')) return '/setup'
  return '/'
}

export default function Sidebar() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const items = modules.map((m) => ({
    key: m.key,
    icon: m.icon,
    disabled: Boolean(m.later),
    label: m.later ? (
      <Tooltip title={`Arrives in ${m.later}`} placement="right">
        <span>{m.label}</span>
      </Tooltip>
    ) : (
      <Link to={m.key}>{m.label}</Link>
    ),
  }))

  return (
    <Sider
      width={232}
      breakpoint="lg"
      collapsedWidth={64}
      collapsed={collapsed}
      onBreakpoint={setCollapsed}
      trigger={null}
      style={{ minHeight: '100vh' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '20px 18px 24px' : '20px 20px 24px', color: '#fff' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect x="1" y="1" width="26" height="26" rx="6" fill={colors.teal} />
          <path d="M7 10h14M7 18h14M11 10v8M17 10v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
        {!collapsed && <span style={{ fontSize: 18, fontWeight: 600 }}>DataBridge</span>}
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[selectedKey(pathname)]} items={items} />
      <div style={{ borderTop: '1px solid #263B4C', margin: collapsed ? '16px 8px 0' : '16px 12px 0', paddingTop: 12 }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey(pathname)]}
          items={[{ key: '/setup', icon: <ControlOutlined />, label: <Link to="/setup">Setup</Link> }]}
        />
      </div>
    </Sider>
  )
}
