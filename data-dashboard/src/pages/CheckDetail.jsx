import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { hasRole, selectWho } from '../redux/sessionSlice'
import { App, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import CheckSummary from '../components/CheckSummary'
import WaiverDialog from '../components/WaiverDialog'
import ReconciliationPanel from '../components/ReconciliationPanel'
import useLoad from '../hooks/useLoad'
import { downloadRegister, getCheck, getFindings } from '../api/databridge'
import { kindLabel, when } from '../format'

const severityTag = {
  CRITICAL: <Tag color="red">Critical</Tag>,
  WARNING: <Tag color="orange">Warning</Tag>,
  INFO: <Tag color="blue">Info</Tag>,
}
const statusText = {
  OPEN: <Tag>Open</Tag>,
  WAIVER_REQUESTED: <Tag color="gold">Waiver requested</Tag>,
  WAIVED: <Tag color="green">Waived</Tag>,
  RESOLVED: <Tag color="green">Resolved</Tag>,
}
const PAGE = 50

/** Sheet quality: rows passing per sheet. Exported for tests. */
export function SheetQuality({ sheets }) {
  return (
    <Table
      rowKey={(s) => `${s.kind}/${s.sheet}`}
      size="small"
      pagination={false}
      dataSource={sheets}
      scroll={{ x: true }}
      columns={[
        { title: 'Workbook', dataIndex: 'kind', render: (v) => kindLabel[v] || v },
        { title: 'Sheet', dataIndex: 'sheet' },
        { title: 'Rows', dataIndex: 'rows', align: 'right' },
        {
          title: 'Rows passing',
          key: 'pass',
          align: 'right',
          render: (_, s) => {
            const pct = s.rows ? ((s.rows - s.rowsWithCritical) / s.rows) * 100 : 100
            return <span className="db-code" style={{ color: pct < 100 ? '#A4231A' : '#1B6E43' }}>{pct.toFixed(1)}%</span>
          },
        },
        { title: 'Critical', dataIndex: 'critical', align: 'right' },
        { title: 'Warnings', dataIndex: 'warning', align: 'right' },
      ]}
    />
  )
}

export default function CheckDetail() {
  const { id } = useParams()
  const who = useSelector(selectWho)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const canDecide = !local || hasRole(user, 'REVIEWER')
  const canRequest = !local || hasRole(user, 'CONSULTANT')
  const { message } = App.useApp()
  const check = useLoad(() => getCheck(id), [id])
  const [filter, setFilter] = useState({ severity: undefined, status: undefined, sheet: undefined, ruleType: undefined })
  const [page, setPage] = useState(1)
  const findings = useLoad(() => getFindings(id, { ...filter, offset: (page - 1) * PAGE, limit: PAGE }), [id, filter, page])
  const [dialog, setDialog] = useState(null)

  const c = check.data
  const sheets = c ? [...new Set(c.sheets.filter((s) => s.critical + s.warning + s.info > 0).map((s) => s.sheet))] : []
  const set = (k) => (v) => {
    setPage(1)
    setFilter((f) => ({ ...f, [k]: v || undefined }))
  }
  const reload = () => {
    findings.reload()
    check.reload()
  }

  return (
    <div className="db-page">
      <PageHeader
        title={c ? `Check ${c.checkNo}` : 'Check'}
        description="Every finding of this check. Values are masked: DataBridge keeps no client data."
        actions={
          <>
            {c && <Link to={`/intake?run=${c.runId}`}><Button>Back to intake</Button></Link>}
            <Button type="primary" icon={<DownloadOutlined />} disabled={!c}
              onClick={() => downloadRegister(id).catch((e) => message.error(e.message))}>
              Exception register
            </Button>
          </>
        }
      />
      <LoadError error={check.error || findings.error} onRetry={reload} />
      {c && <CheckSummary check={c} linkToFindings={false} />}
      {c && <ReconciliationPanel checkId={c.id} onChanged={reload} />}
      {c && (
        <Card title="Quality by sheet" style={{ marginTop: 24 }} styles={{ body: { padding: 0 } }}>
          <SheetQuality sheets={c.sheets} />
        </Card>
      )}

      <Card
        title="Findings"
        style={{ marginTop: 24 }}
        styles={{ body: { padding: 0 } }}
        extra={
          <Space wrap>
            <Select allowClear placeholder="Severity" aria-label="Severity" style={{ width: 130 }} value={filter.severity} onChange={set('severity')}
              options={['CRITICAL', 'WARNING', 'INFO'].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }))} />
            <Select allowClear placeholder="Status" aria-label="Status" style={{ width: 170 }} value={filter.status} onChange={set('status')}
              options={[['OPEN', 'Open'], ['WAIVER_REQUESTED', 'Waiver requested'], ['WAIVED', 'Waived']].map(([value, label]) => ({ value, label }))} />
            <Select allowClear placeholder="Sheet" aria-label="Sheet" style={{ width: 200 }} value={filter.sheet} onChange={set('sheet')}
              options={sheets.map((v) => ({ value: v, label: v }))} />
            <Select allowClear placeholder="Problem" aria-label="Problem" style={{ width: 150 }} value={filter.ruleType} onChange={set('ruleType')}
              options={['REQUIRED', 'LENGTH', 'NUMBER', 'DATE', 'BOOLEAN', 'OPTION', 'FORMAT', 'DUPLICATE', 'REFERENCE', 'RULE', 'TB_BALANCE', 'CONTROL']
                .map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase().replace('_', ' ') }))} />
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={findings.loading}
          dataSource={findings.data?.items || []}
          scroll={{ x: true }}
          pagination={{ current: page, pageSize: PAGE, total: findings.data?.total || 0, onChange: setPage, showSizeChanger: false,
            showTotal: (t) => `${t} finding${t === 1 ? '' : 's'}` }}
          columns={[
            { title: 'Severity', dataIndex: 'severity', width: 100, render: (v) => severityTag[v] },
            { title: 'Where', key: 'where', render: (_, f) => (
              <span>{f.sheet}<br /><span className="db-code" style={{ color: '#5A6672' }}>{f.columnRef}{f.rowNo > 0 ? f.rowNo : ''}</span></span>) },
            { title: 'Problem', key: 'msg', render: (_, f) => (
              <span>{f.message}{f.autoFixable && <Tooltip title="A cleaning recipe can correct this"><Tag style={{ marginLeft: 8 }}>Auto-fixable</Tag></Tooltip>}</span>) },
            { title: 'Value', dataIndex: 'value', render: (v) => <span className="db-code">{v}</span> },
            { title: 'Status', key: 'status', render: (_, f) => (
              <Tooltip title={f.waiverReason ? `${f.waiverReason} (${f.requestedBy}${f.decidedBy ? `; decided by ${f.decidedBy} ${when(f.decidedAt)}` : ''})` : null}>
                {statusText[f.status]}
              </Tooltip>) },
            {
              title: '',
              key: 'act',
              align: 'right',
              render: (_, f) => {
                if (f.status === 'OPEN') return canRequest && <Button size="small" onClick={() => setDialog({ finding: f, mode: 'request' })}>Waive</Button>
                if (f.status === 'WAIVER_REQUESTED') {
                  const own = (f.requestedBy || '').toLowerCase() === who.toLowerCase()
                  if (!own && !canDecide) return <Typography.Text type="secondary">Awaiting a reviewer</Typography.Text>
                  return own ? <Typography.Text type="secondary">Awaiting another reviewer</Typography.Text> : (
                    <Space>
                      <Button size="small" type="primary" onClick={() => setDialog({ finding: f, mode: 'approve' })}>Approve</Button>
                      <Button size="small" danger onClick={() => setDialog({ finding: f, mode: 'reject' })}>Reject</Button>
                    </Space>
                  )
                }
                return null
              },
            },
          ]}
        />
      </Card>
      <WaiverDialog dialog={dialog} onClose={() => setDialog(null)} onDone={() => { setDialog(null); reload() }} />
    </div>
  )
}
