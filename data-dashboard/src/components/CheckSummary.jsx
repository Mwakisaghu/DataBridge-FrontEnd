import { Alert, Card, Col, Progress, Row, Space, Statistic, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { when } from '../format'
import { statusTag } from './statusTags'

const open = (counts, severity) =>
  (counts || []).filter((c) => c.severity === severity && (c.status === 'OPEN' || c.status === 'WAIVER_REQUESTED'))
    .reduce((a, c) => a + c.count, 0)

/** Headline of one validation check: result, readiness, open findings, rules not checked. */
export default function CheckSummary({ check, linkToFindings = true }) {
  const pct = Math.round(Number(check.readiness) * 1000) / 10
  const openCritical = open(check.counts, 'CRITICAL')
  return (
    <Card
      title={<Space>Check {check.checkNo} {statusTag[check.status]}</Space>}
      extra={linkToFindings && <Link to={`/checks/${check.id}`}>Open findings</Link>}
      style={{ marginTop: 24 }}
    >
      {check.status === 'ERROR' && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message="The check could not complete, so it does not count as a pass."
          description={check.error} />
      )}
      <Row gutter={[24, 16]} align="middle">
        <Col xs={24} md={6}>
          <Typography.Text type="secondary">Readiness</Typography.Text>
          <Progress percent={pct} status={check.critical ? 'exception' : 'success'} format={(p) => `${p}%`} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Rows without a Critical finding</Typography.Text>
        </Col>
        <Col xs={12} md={4}><Statistic title="Rows checked" value={check.rows} /></Col>
        <Col xs={12} md={5}>
          <Statistic title="Critical, still open" value={openCritical} valueStyle={openCritical ? { color: '#A4231A' } : undefined} />
        </Col>
        <Col xs={12} md={4}><Statistic title="Warnings" value={check.warning} valueStyle={check.warning ? { color: '#8A4B00' } : undefined} /></Col>
        <Col xs={12} md={5}>
          <Typography.Text type="secondary">Checked</Typography.Text>
          <div>{when(check.createdAt)}</div>
          <Typography.Text type="secondary">by {check.createdBy}</Typography.Text>
        </Col>
      </Row>
      {check.skipped?.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          message={`${check.skipped.length} rule${check.skipped.length === 1 ? ' was' : 's were'} not checked`}
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {[...new Set(check.skipped.map((s) => s.reason))].slice(0, 5).map((r) => <li key={r}>{r}</li>)}
            </ul>
          }
        />
      )}
    </Card>
  )
}
