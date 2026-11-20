import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Alert, App, Button, Card, Cascader, Empty, Select, Space, Table, Tag, Typography, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { cleanWorkbook, getCleaningJob, getCleaningJobs, getOverview, saveBlob } from '../api/databridge'
import { findRun, runOptions } from '../runs'
import { kindFromName, kindLabel, when } from '../format'
import { hasRole } from '../redux/sessionSlice'

const kinds = Object.entries(kindLabel).map(([value, label]) => ({ value, label }))
const actionText = {
  TRIM: 'Spaces tidied', UPPER: 'Capitals', LOWER: 'Small letters', PHONE_KE: 'Phone to +254', OPTION_MATCH: 'Option value',
  PAD_LEFT: 'Padded', REPLACE: 'Replaced', DEFAULT_VALUE: 'Filled in', REMOVE_DUPLICATE_ROWS: 'Duplicate row emptied',
}

/** The change log of one cleaning job: where and what kind of change, never values. */
export function ChangeLog({ jobId }) {
  const job = useLoad(() => getCleaningJob(jobId), [jobId])
  if (job.error) return <LoadError error={job.error} onRetry={job.reload} />
  return (
    <Table
      rowKey={(c) => `${c.sheet}|${c.field}|${c.ruleId}`}
      size="small"
      loading={job.loading}
      pagination={false}
      dataSource={job.data?.changes || []}
      locale={{ emptyText: 'Nothing needed changing' }}
      scroll={{ x: 760 }}
      columns={[
        { title: 'Sheet', dataIndex: 'sheet' },
        { title: 'Column', key: 'col', render: (_, c) => (c.column ? <><span className="db-code">{c.column}</span> {c.field}</> : c.field) },
        { title: 'Change', dataIndex: 'action', render: (a) => actionText[a] || a },
        { title: 'Rule', dataIndex: 'ruleId', render: (v) => <span className="db-code">{v}</span> },
        { title: 'Cells', dataIndex: 'cells', align: 'right' },
        { title: 'Rows', dataIndex: 'rows', render: (v) => <span className="db-code" style={{ wordBreak: 'break-all' }}>{v}</span> },
      ]}
    />
  )
}

/** Module 3: clean workbooks with the Cleaning Setup and download them; keep only the change log. */
export default function Cleaning() {
  const { message } = App.useApp()
  const [params, setParams] = useSearchParams()
  const runId = params.get('run')
  const overviewLoad = useLoad(getOverview)
  const overview = overviewLoad.data || []
  const target = runId ? findRun(overview, runId) : null
  const jobs = useLoad(() => (runId ? getCleaningJobs(runId) : Promise.resolve([])), [runId])
  const [files, setFiles] = useState([]) // { uid, file, kind, progress, state, error }
  const [busy, setBusy] = useState(false)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const canClean = !local || hasRole(user, 'CONSULTANT')
  const closed = target?.run.state === 'CLOSED'

  const update = (uid, patch) => setFiles((fs) => fs.map((f) => (f.uid === uid ? { ...f, ...patch } : f)))

  const run = async () => {
    setBusy(true)
    let ok = 0
    for (const f of files) {
      if (f.state === 'done') continue
      update(f.uid, { state: 'working', error: null })
      try {
        const out = await cleanWorkbook(runId, f.kind, f.file, (p) => update(f.uid, { progress: p }))
        saveBlob(out.blob, out.fileName)
        update(f.uid, { state: 'done', jobId: out.jobId })
        ok++
      } catch (e) {
        update(f.uid, { state: 'error', error: e.message })
      }
    }
    setBusy(false)
    if (ok) message.success(`${ok} cleaned workbook${ok > 1 ? 's' : ''} downloaded`)
    jobs.reload()
  }

  return (
    <div className="db-page">
      <PageHeader
        title="Cleaning"
        description="Fixes what can be fixed without a person deciding: spaces, capitals, phone numbers, option values, exact duplicate rows. The cleaned file goes straight back to you."
      />
      <LoadError error={overviewLoad.error || jobs.error} onRetry={() => { overviewLoad.reload(); jobs.reload() }} />
      <Card>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Run</Typography.Text>
            <Cascader
              aria-label="Run"
              style={{ width: '100%', maxWidth: 640 }}
              options={runOptions(overview)}
              value={target ? [target.client.id, target.project.id, target.run.id] : []}
              placeholder="Choose client, project and run"
              onChange={(path) => { setFiles([]); setParams(path?.length === 3 ? { run: path[2] } : {}) }}
              allowClear
              showSearch
            />
          </div>
          {runId && closed && <Alert type="info" showIcon message="This run is closed. Open a new run to clean workbooks." />}
          {runId && !closed && canClean && (
            <>
              <Upload.Dragger
                multiple
                accept=".xlsx,.xlsm"
                showUploadList={false}
                beforeUpload={(file) => {
                  const uid = `${file.name}|${file.size}|${file.lastModified}`
                  setFiles((fs) => (fs.some((f) => f.uid === uid) ? fs : [...fs, { uid, file, kind: kindFromName(file.name), state: 'ready' }]))
                  return false
                }}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Drop the workbooks to clean, or click to choose</p>
                <p className="ant-upload-hint">Only the change log is kept: where and what kind of change, never a value.</p>
              </Upload.Dragger>
              {files.length > 0 && (
                <Table
                  rowKey="uid"
                  size="small"
                  pagination={false}
                  dataSource={files}
                  columns={[
                    { title: 'Workbook', key: 'n', render: (_, f) => f.file.name },
                    {
                      title: 'Template', key: 'k',
                      render: (_, f) => (
                        <Select aria-label={`Template for ${f.file.name}`} value={f.kind} options={kinds} style={{ width: 170 }}
                          disabled={f.state !== 'ready'} onChange={(k) => update(f.uid, { kind: k })} />
                      ),
                    },
                    {
                      title: 'Result', key: 's',
                      render: (_, f) => f.state === 'done' ? <Tag color="green">Cleaned and downloaded</Tag>
                        : f.state === 'error' ? <Typography.Text type="danger">{f.error}</Typography.Text>
                        : f.state === 'working' ? <Tag color="blue">Cleaning{f.progress ? ` ${f.progress}%` : ''}</Tag>
                        : <Tag>Ready</Tag>,
                    },
                    { title: '', key: 'x', align: 'right', render: (_, f) => f.state !== 'working' && <Button size="small" onClick={() => setFiles((fs) => fs.filter((x) => x.uid !== f.uid))}>Remove</Button> },
                  ]}
                />
              )}
              <Space>
                <Button type="primary" onClick={run} loading={busy} disabled={!files.some((f) => f.state !== 'done')}>
                  Clean and download
                </Button>
                {files.some((f) => f.state === 'done') && (
                  <Typography.Text type="secondary">
                    Next: submit the cleaned files in <Link to={`/intake?run=${runId}`}>Intake &amp; validation</Link>.
                  </Typography.Text>
                )}
              </Space>
            </>
          )}
        </Space>
      </Card>

      {runId && (
        <Card title="Cleaning history" style={{ marginTop: 24 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            loading={jobs.loading}
            dataSource={jobs.data || []}
            pagination={false}
            locale={{ emptyText: <Empty description="No workbooks cleaned in this run yet" /> }}
            scroll={{ x: 760 }}
            expandable={{ expandedRowRender: (j) => <ChangeLog jobId={j.id} />, rowExpandable: (j) => j.status === 'SUCCEEDED' }}
            columns={[
              { title: 'When', dataIndex: 'createdAt', render: when },
              { title: 'Workbook', key: 'w', render: (_, j) => <>{j.fileName}<div><Typography.Text type="secondary">{kindLabel[j.kind] || j.kind}</Typography.Text></div></> },
              { title: 'Cells changed', dataIndex: 'cells', align: 'right' },
              { title: 'Duplicate rows', dataIndex: 'rowsEmptied', align: 'right' },
              { title: 'By', dataIndex: 'createdBy' },
              { title: 'Result', key: 's', render: (_, j) => (j.status === 'SUCCEEDED' ? <Tag color="green">Cleaned</Tag> : <Tag color="red" title={j.error}>Error</Tag>) },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
