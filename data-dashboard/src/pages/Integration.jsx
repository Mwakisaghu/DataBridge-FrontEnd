import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Alert, App, Button, Card, Cascader, Empty, InputNumber, Input, Modal, Select, Space, Table, Tag, Typography, Upload } from 'antd'
import { CloudSyncOutlined, InboxOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { buildPackage, getImports, getOverview, getPackages, recordImport, saveBlob, verifyImports } from '../api/databridge'
import { findRun, runOptions } from '../runs'
import { kindFromName, kindLabel, when } from '../format'
import { hasRole } from '../redux/sessionSlice'

const kinds = Object.entries(kindLabel).map(([value, label]) => ({ value, label }))
const statusTag = {
  PENDING: <Tag>Not imported yet</Tag>,
  IMPORTED: <Tag color="blue">Imported</Tag>,
  PARTIAL: <Tag color="gold">Partly imported</Tag>,
  FAILED: <Tag color="red">Failed</Tag>,
  MATCHED: <Tag color="green">Matches Business Central</Tag>,
  MISMATCH: <Tag color="red">Count differs</Tag>,
}

/** Record what Business Central reported for one table's import. */
function RecordDialog({ record, runId, onClose, onDone }) {
  const { message } = App.useApp()
  const [rows, setRows] = useState(record?.importedRows ?? record?.expectedRows)
  const [note, setNote] = useState(record?.note || '')
  const [busy, setBusy] = useState(false)
  if (!record) return null
  const save = async (failed) => {
    setBusy(true)
    try {
      await recordImport(runId, record.sheet, { importedRows: failed ? null : rows, failed, note })
      message.success(`${record.sheet} recorded`)
      onDone()
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open title={`Import of ${record.sheet}`} onCancel={onClose} destroyOnClose
      footer={<Space><Button danger loading={busy} onClick={() => save(true)}>Import failed</Button><Button type="primary" loading={busy} onClick={() => save(false)}>Save</Button></Space>}>
      <Typography.Paragraph>The package had {record.expectedRows} row(s). How many did Business Central import?</Typography.Paragraph>
      <Space direction="vertical" style={{ width: '100%' }}>
        <InputNumber aria-label="Rows imported" min={0} value={rows} onChange={setRows} style={{ width: 200 }} />
        <Input.TextArea aria-label="Note" rows={3} maxLength={500} showCount placeholder="e.g. 5 rejected: missing loan product"
          value={note} onChange={(e) => setNote(e.target.value)} />
      </Space>
    </Modal>
  )
}

/** Module 5: import packages in dependency order, import tracking and counts from Business Central. */
export default function Integration() {
  const { message } = App.useApp()
  const [params, setParams] = useSearchParams()
  const runId = params.get('run')
  const overviewLoad = useLoad(getOverview)
  const overview = overviewLoad.data || []
  const target = runId ? findRun(overview, runId) : null
  const packages = useLoad(() => (runId ? getPackages(runId) : Promise.resolve([])), [runId])
  const imports = useLoad(() => (runId ? getImports(runId) : Promise.resolve([])), [runId])
  const [file, setFile] = useState(null)
  const [kind, setKind] = useState('STATIC')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [editing, setEditing] = useState(null)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const canAct = !local || hasRole(user, 'CONSULTANT')

  const build = async () => {
    setBusy(true)
    setError(null)
    try {
      const out = await buildPackage(runId, kind, file)
      saveBlob(out.blob, out.fileName)
      message.success('Import package downloaded')
      setFile(null)
      packages.reload()
      imports.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setVerifying(true)
    try {
      const out = await verifyImports(runId)
      const bad = out.filter((r) => r.status === 'MISMATCH').length
      message[bad ? 'warning' : 'success'](bad ? `${bad} table(s) differ from Business Central` : 'Counts read from Business Central')
      imports.reload()
    } catch (e) {
      message.error(e.message)
    } finally {
      setVerifying(false)
    }
  }

  const rows = [...(imports.data || [])].sort((a, b) => {
    const order = (packages.data?.[0]?.tables || []).map((t) => t.sheet)
    return order.indexOf(a.sheet) - order.indexOf(b.sheet)
  })

  return (
    <div className="db-page">
      <PageHeader
        title="Integration"
        description="Builds the Business Central import package from the workbook you validated, in the order the tables must be imported, then tracks each table's import."
      />
      <LoadError error={overviewLoad.error || packages.error || imports.error} onRetry={() => { overviewLoad.reload(); packages.reload(); imports.reload() }} />
      <Card>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Run</Typography.Text>
        <Cascader
          aria-label="Run"
          style={{ width: '100%', maxWidth: 640 }}
          options={runOptions(overview)}
          value={target ? [target.client.id, target.project.id, target.run.id] : []}
          placeholder="Choose client, project and run"
          onChange={(path) => { setFile(null); setError(null); setParams(path?.length === 3 ? { run: path[2] } : {}) }}
          allowClear
          showSearch
        />
      </Card>

      {runId && canAct && target?.run.state === 'OPEN' && (
        <Card title="Build an import package" style={{ marginTop: 24 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              Use the exact file you submitted in <Link to={`/intake?run=${runId}`}>Intake &amp; validation</Link>: DataBridge checks its
              fingerprint against the latest check, and refuses while that workbook has Critical findings that are neither fixed nor waived.
            </Typography.Paragraph>
            <Upload.Dragger
              accept=".xlsx,.xlsm"
              showUploadList={false}
              beforeUpload={(f) => { setFile(f); setKind(kindFromName(f.name)); setError(null); return false }}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">{file ? file.name : 'Drop the validated workbook, or click to choose'}</p>
            </Upload.Dragger>
            {file && (
              <Space wrap>
                <Select aria-label="Template" value={kind} options={kinds} style={{ width: 200 }} onChange={setKind} />
                <Button type="primary" onClick={build} loading={busy}>Build and download package</Button>
              </Space>
            )}
            {error && <Alert type="error" showIcon message={error} />}
          </Space>
        </Card>
      )}

      {runId && (
        <Card
          title="Import tracking"
          style={{ marginTop: 24 }}
          styles={{ body: { padding: 0 } }}
          extra={canAct && rows.length > 0 && (
            <Button icon={<CloudSyncOutlined />} onClick={verify} loading={verifying}>Read counts from Business Central</Button>
          )}
        >
          <Table
            rowKey="sheet"
            loading={imports.loading}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 900 }}
            locale={{ emptyText: <Empty description="Build a package to start tracking its import" /> }}
            columns={[
              { title: 'Sheet', dataIndex: 'sheet' },
              { title: 'Table', dataIndex: 'tableId', render: (v) => <span className="db-code">{v}</span> },
              { title: 'Rows packaged', dataIndex: 'expectedRows', align: 'right' },
              { title: 'Rows imported', dataIndex: 'importedRows', align: 'right', render: (v) => v ?? '–' },
              { title: 'In Business Central', dataIndex: 'bcCount', align: 'right', render: (v) => v ?? '–' },
              { title: 'Status', dataIndex: 'status', render: (s) => statusTag[s] || s },
              { title: 'Note', dataIndex: 'note', render: (v) => v && <Typography.Text type="secondary">{v}</Typography.Text> },
              { title: '', key: 'a', align: 'right', render: (_, r) => canAct && <Button size="small" onClick={() => setEditing(r)}>Record</Button> },
            ]}
          />
        </Card>
      )}

      {runId && (packages.data || []).length > 0 && (
        <Card title="Packages built" style={{ marginTop: 24 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={packages.data}
            pagination={false}
            scroll={{ x: 700 }}
            columns={[
              { title: 'When', dataIndex: 'createdAt', render: when },
              { title: 'Workbook', dataIndex: 'fileName' },
              { title: 'Template', dataIndex: 'kind', render: (k) => kindLabel[k] || k },
              { title: 'Tables', key: 't', align: 'right', render: (_, p) => p.tables.length },
              { title: 'Rows', key: 'r', align: 'right', render: (_, p) => p.tables.reduce((n, t) => n + t.rows, 0) },
              { title: 'By', dataIndex: 'createdBy' },
              { title: 'Gate', key: 'g', render: (_, p) => (p.checkId ? <Tag color="green">Validated</Tag> : <Tag color="gold">Check not required</Tag>) },
            ]}
          />
        </Card>
      )}
      <RecordDialog key={editing?.sheet} record={editing} runId={runId} onClose={() => setEditing(null)}
        onDone={() => { setEditing(null); imports.reload() }} />
    </div>
  )
}
