import { Typography } from 'antd'

/** Page title with a one-line description and the page's main actions on the right. */
export default function PageHeader({ title, description, actions }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <div style={{ maxWidth: 720 }}>
        <Typography.Title level={2} style={{ margin: 0, fontWeight: 600, fontSize: 26 }}>
          {title}
        </Typography.Title>
        {description && (
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            {description}
          </Typography.Paragraph>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}
