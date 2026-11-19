import { Card, Typography } from 'antd'
import { colors } from '../theme'

/** The centred card the sign-in and password screens share. */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: colors.navy, padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 400 }} styles={{ body: { padding: 32 } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <rect x="1" y="1" width="26" height="26" rx="6" fill={colors.teal} />
            <path d="M7 10h14M7 18h14M11 10v8M17 10v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600 }}>DataBridge</span>
        </div>
        <Typography.Title level={3} style={{ marginTop: 0 }}>{title}</Typography.Title>
        {subtitle && <Typography.Paragraph type="secondary">{subtitle}</Typography.Paragraph>}
        {children}
      </Card>
    </main>
  )
}
