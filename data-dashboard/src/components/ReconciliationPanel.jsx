import { useState } from 'react'
import { useSelector } from 'react-redux'
import { App, Button, Card, Col, Empty, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import useLoad from '../hooks/useLoad'
import { downloadReconPack, getReconciliation } from '../api/databridge'
import { money } from '../format'
import { hasRole, selectWho } from '../redux/sessionSlice'
import WaiverDialog from './WaiverDialog'
import LoadError from './LoadError'

const statusTag = {
  TIES: <Tag color="green">Ties</Tag>,
  VARIANCE: <Tag color="red">Variance</Tag>,
  NOT_CHECKED: <Tag>Not checked</Tag>,
}

function Approval({ finding }) {
  if (!finding) return null
  if (finding.status === 'WAIVED') return <Tag color="green">Approved by {finding.decidedBy}</Tag>
  if (finding.status === 'WAIVER_REQUESTED') return <Tag color="gold">Awaiting Finance</Tag>
  return <Tag color="red">Not explained</Tag>
}

/**
 * Module 4 for one check: the trial balance totals and every control account against its
 * subledgers. Variances are explained by a consultant and approved by Finance.
 */
export default function ReconciliationPanel({ checkId, onChanged }) {
  const lines = useLoad(() => getReconciliation(checkId), [checkId])
  const { message } = App.useApp()
  const who = useSelector(selectWho)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const canExplain = !local || hasRole(user, 'CONSULTANT')
  const canApprove = !local || hasRole(user, 'FINANCE')
  const [dialog, setDialog] = useState(null)

  if (lines.error) return <LoadError error={lines.error} onRetry={lines.reload} />
  const all = lines.data || []
  if (!lines.loading && all.length === 0) {
    return (
      <Card title="Reconciliation" style={{ marginTop: 24 }}>
        <Empty description="Nothing was reconciled in this check. Submit the transactional workbook with its trial balance." />
      </Card>
    )
  }
  const tb = all.find((l) => l.line.type === 'TB')
  const controls = all.filter((l) => l.line.type === 'CONTROL')
  const count = (st) => controls.filter((l) => l.line.status === st).length
  const unapproved = all.filter((l) => l.finding && l.finding.status !== 'WAIVED').length

  const action = (l) => {
    const f = l.finding
    if (!f) return null
    if (f.status === 'OPEN') {
      return canExplain && <Button size="small" onClick={() => setDialog({ finding: f, mode: 'request' })}>Explain</Button>
    }
    if (f.status === 'WAIVER_REQUESTED') {
      const own = (f.requestedBy || '').toLowerCase() === who.toLowerCase()
      if (own || !canApprove) return <Typography.Text type="secondary">{own ? 'Waiting for Finance' : 'Finance approves'}</Typography.Text>
      return (
        <Space>
          <Button size="small" type="primary" onClick={() => setDialog({ finding: f, mode: 'approve' })}>Approve</Button>
          <Button size="small" danger onClick={() => setDialog({ finding: f, mode: 'reject' })}>Reject</Button>
        </Space>
      )
    }
    return null
  }

  const pack = async () => {
    try {
      await downloadReconPack(checkId)
    } catch (e) {
      message.error(e.message)
    }
  }

  return (
    <Card
      title="Reconciliation"
      style={{ marginTop: 24 }}
      extra={<Button icon={<DownloadOutlined />} onClick={pack}>Reconciliation pack</Button>}
      loading={lines.loading}
    >
      <Row gutter={[24, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12} lg={6}>
          <Statistic title="Trial balance" valueRender={() => (tb ? statusTag[tb.line.status] : '–')} />
          {tb?.line.status !== 'NOT_CHECKED' && tb && (
            <div className="db-code" style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
              <div>Dr {money(tb.line.left)}</div>
              <div>Cr {money(tb.line.right)}</div>
            </div>
          )}
        </Col>
        <Col xs={8} lg={4}><Statistic title="Controls tie" value={count('TIES')} /></Col>
        <Col xs={8} lg={4}><Statistic title="With a variance" value={count('VARIANCE')} valueStyle={count('VARIANCE') ? { color: '#A4231A' } : undefined} /></Col>
        <Col xs={8} lg={4}><Statistic title="Not checked" value={count('NOT_CHECKED')} /></Col>
        <Col xs={24} lg={6}><Statistic title="Awaiting explanation or approval" value={unapproved} /></Col>
      </Row>
      <Table
        rowKey={(l) => l.line.lineNo}
        size="small"
        pagination={false}
        dataSource={all}
        scroll={{ x: 900 }}
        expandable={{
          expandedRowRender: (l) => (
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary">Compared with: {l.line.sources || '–'}</Typography.Text>
              {l.line.note && <Typography.Text>{l.line.note}</Typography.Text>}
              {l.finding?.waiverReason && <Typography.Text>Explanation ({l.finding.requestedBy}): {l.finding.waiverReason}</Typography.Text>}
              {l.finding?.decisionNote && <Typography.Text>Finance note ({l.finding.decidedBy}): {l.finding.decisionNote}</Typography.Text>}
            </Space>
          ),
        }}
        columns={[
          { title: 'GL account', key: 'gl', render: (_, l) => <span className="db-code">{l.line.type === 'TB' ? 'TB' : l.line.glAccount}</span> },
          { title: 'Name', key: 'n', render: (_, l) => l.line.name },
          { title: 'GL balance', key: 'l', align: 'right', render: (_, l) => <span className="db-code">{l.line.type === 'TB' ? `Dr ${money(l.line.left)}` : money(l.line.left)}</span> },
          { title: 'Subledger', key: 'r', align: 'right', render: (_, l) => <span className="db-code">{l.line.type === 'TB' ? `Cr ${money(l.line.right)}` : money(l.line.right)}</span> },
          {
            title: 'Variance', key: 'v', align: 'right',
            render: (_, l) => (
              <span className="db-code" style={{ color: Number(l.line.variance) ? '#A4231A' : undefined, fontWeight: Number(l.line.variance) ? 600 : 400 }}>
                {money(l.line.variance)}
              </span>
            ),
          },
          { title: 'Status', key: 's', render: (_, l) => statusTag[l.line.status] },
          { title: 'Explanation', key: 'e', render: (_, l) => <Approval finding={l.finding} /> },
          { title: '', key: 'a', align: 'right', render: (_, l) => action(l) },
        ]}
      />
      <WaiverDialog
        dialog={dialog}
        wording="variance"
        onClose={() => setDialog(null)}
        onDone={() => {
          setDialog(null)
          lines.reload()
          onChanged?.()
        }}
      />
    </Card>
  )
}
