import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Alert, App, Button, Card, Cascader, Col, Input, List, Modal, Row, Space, Statistic, Tag, Typography } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, DownloadOutlined, PrinterOutlined } from '@ant-design/icons'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { decideSignOff, downloadSignOffPack, getOverview, getRunSummary, requestSignOff } from '../api/databridge'
import { findRun, runOptions } from '../runs'
import { when } from '../format'
import { colors } from '../theme'
import { hasRole, selectWho } from '../redux/sessionSlice'

const signOffTag = {
  REQUESTED: <Tag color="gold">Awaiting Finance</Tag>,
  APPROVED: <Tag color="green">Signed off</Tag>,
  REJECTED: <Tag color="red">Rejected</Tag>,
}

/** The reconciliation tile, by the same rules as the checklist. */
function reconState(r) {
  if (!r.lines || r.notChecked === r.lines) return 'Not run'
  if (r.notChecked) return 'Incomplete'
  if (r.unapproved) return `${r.unapproved} open`
  return 'Done'
}

/** Readiness over the run's checks: share of rows without a Critical finding. */
export function ReadinessTrend({ trend }) {
  if (!trend.length) return <Typography.Text type="secondary">No checks yet</Typography.Text>
  const data = trend.map((t) => ({ name: `Check ${t.checkNo}`, readiness: Math.round(Number(t.readiness) * 1000) / 10, critical: t.critical }))
  return (
    <div style={{ width: '100%', height: 220 }} role="img" aria-label={`Readiness over ${trend.length} check(s)`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#E5E9EC" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v, n) => (n === 'readiness' ? [`${v}%`, 'Readiness'] : [v, 'Critical'])} />
          <Line type="monotone" dataKey="readiness" stroke={colors.teal} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SignOffDialog({ mode, runId, onClose, onDone }) {
  const { message } = App.useApp()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  if (!mode) return null
  const title = { request: 'Request sign-off', approve: 'Approve sign-off', reject: 'Reject sign-off' }[mode]
  const submit = async () => {
    setBusy(true)
    try {
      if (mode === 'request') await requestSignOff(runId, note || null)
      else await decideSignOff(runId, mode === 'approve', note || null)
      message.success(mode === 'request' ? 'Sign-off requested' : mode === 'approve' ? 'Run signed off and closed' : 'Sign-off rejected')
      onDone()
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open title={title} okText={title} onOk={submit} confirmLoading={busy} onCancel={onClose} destroyOnClose
      okButtonProps={{ danger: mode === 'reject', disabled: mode === 'reject' && !note.trim() }}>
      {mode === 'approve' && (
        <Typography.Paragraph>Approving issues the migration certificate and closes the run: no more uploads or changes.</Typography.Paragraph>
      )}
      <Input.TextArea aria-label="Note" rows={3} maxLength={500} showCount value={note} onChange={(e) => setNote(e.target.value)}
        placeholder={mode === 'reject' ? 'Why the run is not ready' : 'Optional note'} />
    </Modal>
  )
}

/** Module 6: a run's KPIs, readiness checklist and maker-checker sign-off. */
export default function Reports() {
  const { message } = App.useApp()
  const [params, setParams] = useSearchParams()
  const runId = params.get('run')
  const overviewLoad = useLoad(getOverview)
  const overview = overviewLoad.data || []
  const target = runId ? findRun(overview, runId) : null
  const summary = useLoad(() => (runId ? getRunSummary(runId) : Promise.resolve(null)), [runId])
  const [dialog, setDialog] = useState(null)
  const who = useSelector(selectWho)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const canRequest = !local || hasRole(user, 'CONSULTANT')
  const canDecide = !local || hasRole(user, 'FINANCE')
  const s = summary.data
  const so = s?.signOff

  const pack = async () => {
    try {
      await downloadSignOffPack(runId)
    } catch (e) {
      message.error(e.message)
    }
  }

  return (
    <div className="db-page">
      <PageHeader
        title="Reports and sign-off"
        description="Where a run stands, what is left before it can be signed off, and the sign-off itself: requested by the consultant, approved by Finance."
        actions={runId && <Button icon={<DownloadOutlined />} onClick={pack}>Sign-off pack</Button>}
      />
      <LoadError error={overviewLoad.error || summary.error} onRetry={() => { overviewLoad.reload(); summary.reload() }} />
      <Card>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Run</Typography.Text>
        <Cascader aria-label="Run" style={{ width: '100%', maxWidth: 640 }} options={runOptions(overview)}
          value={target ? [target.client.id, target.project.id, target.run.id] : []} placeholder="Choose client, project and run"
          onChange={(path) => setParams(path?.length === 3 ? { run: path[2] } : {})} allowClear showSearch />
      </Card>

      {s && (
        <>
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={12} lg={6}><Card><Statistic title="Readiness" value={s.latestCheck ? Number(s.latestCheck.readiness) * 100 : 0} precision={1} suffix="%" /></Card></Col>
            <Col xs={12} lg={6}><Card><Statistic title="Critical findings open" value={s.findings.openCritical + s.findings.awaitingCritical}
              valueStyle={s.findings.openCritical + s.findings.awaitingCritical ? { color: '#A4231A' } : undefined} /></Card></Col>
            <Col xs={12} lg={6}><Card><Statistic title="Reconciliation" value={reconState(s.reconciliation)} /></Card></Col>
            <Col xs={12} lg={6}><Card><Statistic title="Tables imported" value={`${s.imports.done} / ${s.imports.tables}`} /></Card></Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={14}>
              <Card title="Readiness by check">
                <ReadinessTrend trend={s.trend} />
                <Space wrap size={24} style={{ marginTop: 12 }}>
                  <Typography.Text type="secondary">{s.findings.waivedCritical} Critical waived</Typography.Text>
                  <Typography.Text type="secondary">{s.findings.openWarning} warnings open</Typography.Text>
                  <Typography.Text type="secondary">{s.cleaning.jobs} workbook(s) cleaned, {s.cleaning.cells} cells changed</Typography.Text>
                  <Typography.Text type="secondary">{s.packages} package(s) built</Typography.Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Ready for sign-off?" extra={so && signOffTag[so.status]}>
                <List
                  dataSource={s.checklist}
                  renderItem={(i) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={i.passed ? <CheckCircleFilled style={{ color: '#1B6E43', fontSize: 18 }} aria-label="Passed" />
                          : <CloseCircleFilled style={{ color: '#A4231A', fontSize: 18 }} aria-label="Not yet" />}
                        title={i.label}
                        description={i.detail}
                      />
                    </List.Item>
                  )}
                />
                {so?.status === 'APPROVED' ? (
                  <Alert type="success" showIcon message={`Signed off by ${so.decidedBy}, ${when(so.decidedAt)}`}
                    description={<Space direction="vertical" size={4}>
                      <span>Certificate <Typography.Text code>{so.certificateNo}</Typography.Text></span>
                      <Link to={`/reports/certificate?run=${runId}`}><Button icon={<PrinterOutlined />}>Migration certificate</Button></Link>
                    </Space>} />
                ) : so?.status === 'REQUESTED' ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Typography.Text>Requested by {so.requestedBy}, {when(so.requestedAt)}{so.requestNote ? `: ${so.requestNote}` : ''}</Typography.Text>
                    {canDecide && (so.requestedBy || '').toLowerCase() !== who.toLowerCase() ? (
                      <Space>
                        <Button type="primary" onClick={() => setDialog('approve')}>Approve</Button>
                        <Button danger onClick={() => setDialog('reject')}>Reject</Button>
                      </Space>
                    ) : <Typography.Text type="secondary">Waiting for Finance; never the requester.</Typography.Text>}
                  </Space>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {so?.status === 'REJECTED' && <Alert type="warning" showIcon message={`Rejected by ${so.decidedBy}: ${so.decisionNote}`} />}
                    {canRequest && s.run.state === 'OPEN' && (
                      <Button type="primary" disabled={!s.ready} onClick={() => setDialog('request')}>Request sign-off</Button>
                    )}
                    {s.run.state === 'CLOSED' && <Typography.Text type="secondary">This run is closed.</Typography.Text>}
                  </Space>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
      {!runId && <Card style={{ marginTop: 24 }}><Typography.Text type="secondary">Choose a run to see its reports.</Typography.Text></Card>}
      <SignOffDialog mode={dialog} runId={runId} onClose={() => setDialog(null)} onDone={() => { setDialog(null); summary.reload() }} />
    </div>
  )
}
