import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, App, Button, Card, Cascader, Descriptions, Drawer, Empty, Progress, Select, Space, Table, Tag, Typography, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { addSubmissionFile, cancelSubmission, getChecks, getDatasets, getOverview, getSchema, openSubmission, processSubmission } from '../api/databridge'
import CheckSummary from '../components/CheckSummary'
import { statusTag } from '../components/statusTags'
import { bytes, kindFromName, kindLabel, runLabel, shortHash, when } from '../format'
import { findRun, runOptions } from '../runs'

const kinds = Object.entries(kindLabel).map(([value, label]) => ({ value, label }))


const typeText = (f) => {
  const t = f.type.charAt(0) + f.type.slice(1).toLowerCase()
  if (f.length) return `${t}${f.length}`
  if (f.type === 'OPTION') return `Option (${f.options.length} values)`
  if (f.type === 'UNKNOWN') return 'No type'
  return t
}

/** Columns of one sheet, from the stored schema. */
function SheetColumns({ sheet }) {
  return (
    <Table
      rowKey="column"
      size="small"
      pagination={false}
      dataSource={sheet.fields}
      columns={[
        { title: 'Col', dataIndex: 'column', width: 56, render: (v) => <span className="db-code">{v}</span> },
        { title: 'Caption', dataIndex: 'caption' },
        {
          title: 'Type',
          key: 'type',
          render: (_, f) => (f.type === 'UNKNOWN' ? <Typography.Text type="warning">No type</Typography.Text> : <span className="db-code">{typeText(f)}</span>),
        },
        {
          title: 'From',
          dataIndex: 'source',
          render: (v) => ({ TEMPLATE_COMMENT: 'Template', TEMPLATE_SETUP: 'Template Setup', NONE: '-' })[v],
        },
        { title: 'Required', dataIndex: 'required', render: (v) => (v ? 'Yes' : '') },
      ]}
    />
  )
}

/** Per-sheet result of one upload. Exported for tests. */
export function SheetResults({ sheets, onShowColumns }) {
  return (
    <Table
      rowKey="sheetName"
      size="middle"
      pagination={false}
      dataSource={sheets}
      scroll={{ x: true }}
      expandable={{
        rowExpandable: (s) => s.warnings.length > 0,
        expandedRowRender: (s) => (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {s.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        ),
      }}
      columns={[
        { title: 'Sheet', dataIndex: 'sheetName', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
        { title: 'Business Central table', dataIndex: 'tableName', render: (v) => v || <Typography.Text type="secondary">Not known</Typography.Text> },
        { title: 'Table ID', dataIndex: 'tableId', align: 'right', render: (v) => (v ? <span className="db-code">{v}</span> : '-') },
        { title: 'Caption row', dataIndex: 'captionRow', align: 'right' },
        {
          title: 'Typed columns',
          key: 'typed',
          align: 'right',
          render: (_, s) => (
            <span className="db-code" style={{ color: s.typedColumns < s.columns ? '#8A4B00' : undefined }}>
              {s.typedColumns} of {s.columns}
            </span>
          ),
        },
        {
          title: 'Warnings',
          key: 'warnings',
          render: (_, s) => (s.warnings.length ? <Tag color="orange">{s.warnings.length}</Tag> : <Tag color="green">None</Tag>),
        },
        onShowColumns && {
          title: '',
          key: 'cols',
          align: 'right',
          render: (_, s) => <Button size="small" onClick={() => onShowColumns(s.sheetName)}>Columns</Button>,
        },
      ].filter(Boolean)}
    />
  )
}

function DatasetResult({ r, onShowColumns }) {
  const d = r.dataset
  const ok = d.status === 'SUCCEEDED'
  return (
    <Card size="small" style={{ marginTop: 16 }} title={`${kindLabel[d.kind]}: ${d.fileName}, version ${d.versionNo}`}
      extra={<span className="db-code" style={{ whiteSpace: 'nowrap' }}>{bytes(d.sizeBytes)} · {shortHash(d.sha256)}</span>}>
      {!ok && <Alert type="error" showIcon message="This workbook could not be read. It is recorded as a failed upload." description={d.error} />}
      {ok && <SheetResults sheets={r.sheets} onShowColumns={(sheet) => onShowColumns(d.id, sheet)} />}
    </Card>
  )
}

export default function Intake() {
  const { message } = App.useApp()
  const [params, setParams] = useSearchParams()
  const runId = params.get('run')
  const overviewLoad = useLoad(getOverview)
  const overview = useMemo(() => overviewLoad.data || [], [overviewLoad.data])
  const target = runId ? findRun(overview, runId) : null
  const history = useLoad(() => (runId ? getDatasets(runId) : Promise.resolve([])), [runId])
  const checks = useLoad(() => (runId ? getChecks(runId) : Promise.resolve([])), [runId])

  const [files, setFiles] = useState([]) // [{ uid, file, kind }]
  const [busy, setBusy] = useState(null) // { step, percent }
  const [result, setResult] = useState(null)
  const [drawer, setDrawer] = useState(null) // { datasetId, sheetName, schema }

  const showColumns = async (datasetId, sheetName) => {
    try {
      const schema = await getSchema(datasetId)
      setDrawer({ datasetId, sheetName, schema })
    } catch (e) {
      message.error(e.message)
    }
  }

  const addFiles = (_file, list) => {
    setResult(null)
    setFiles((prev) => {
      const next = [...prev]
      for (const f of list) {
        const uid = `${f.name}|${f.size}|${f.lastModified}`
        if (next.some((x) => x.uid === uid)) continue
        next.push({ uid, file: f, kind: kindFromName(f.name) })
      }
      return next
    })
    return false // keep the files in the browser until "Validate"
  }

  const duplicateKinds = files.length !== new Set(files.map((f) => f.kind)).size

  const validate = async () => {
    setResult(null)
    let sub
    try {
      setBusy({ step: 'Opening a workspace', percent: 0 })
      sub = await openSubmission(runId)
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        setBusy({ step: `Sending ${f.file.name}`, percent: Math.round((i / files.length) * 80) })
        const received = await addSubmissionFile(sub.id, f.kind, f.file, (p) =>
          setBusy({ step: `Sending ${f.file.name}`, percent: Math.round(((i + p / 100) / files.length) * 80) }))
        if (received.error) message.warning(`${f.file.name}: ${received.error}`)
      }
      setBusy({ step: 'Reading and validating the workbooks together', percent: 90 })
      const r = await processSubmission(sub.id)
      setResult(r)
      setFiles([])
      const c = r.check
      if (c.status === 'SUCCEEDED') message.success(`Check ${c.checkNo} passed`)
      else if (c.status === 'FAILED') message.warning(`Check ${c.checkNo}: ${c.critical} Critical finding${c.critical === 1 ? '' : 's'}`)
      else message.error(`Check ${c.checkNo} could not complete`)
      history.reload()
      checks.reload()
    } catch (e) {
      message.error(e.message)
      if (sub) cancelSubmission(sub.id).catch(() => {})
    } finally {
      setBusy(null)
    }
  }

  const selectedPath = target ? [target.client.id, target.project.id, target.run.id] : []
  const closed = target?.run.state === 'CLOSED'
  const drawerSheet = drawer?.schema.sheets.find((s) => s.sheetName === drawer.sheetName)

  return (
    <div className="db-page">
      <PageHeader
        title="Intake and validation"
        description="Send a run's filled-in templates together. DataBridge reads and validates them as one set, including references between workbooks, records the findings with masked values, and destroys the files."
      />
      <LoadError error={overviewLoad.error} onRetry={overviewLoad.reload} />

      <Card>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Run</Typography.Text>
            <Cascader
              style={{ width: '100%', maxWidth: 640 }}
              options={runOptions(overview)}
              value={selectedPath}
              placeholder={overview.length ? 'Choose client, project and run' : 'Add a client and open a run in the Control Centre first'}
              onChange={(path) => {
                setResult(null)
                setParams(path?.length === 3 ? { run: path[2] } : {})
              }}
              allowClear
              showSearch
            />
          </div>
          {closed && <Alert type="info" showIcon message="This run is closed. Its checks are listed below; open a new run to submit more." />}
          <Upload.Dragger
            accept=".xlsx,.xlsm"
            multiple
            showUploadList={false}
            beforeUpload={addFiles}
            disabled={!target || closed || busy !== null}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">
              {target ? 'Drop the Static, Transactional and HR workbooks here, or click to choose them' : 'Choose a run first'}
            </p>
            <p className="ant-upload-hint">Send them together so references between workbooks are checked. Excel .xlsx or .xlsm.</p>
          </Upload.Dragger>

          {files.length > 0 && (
            <Table
              rowKey="uid"
              size="small"
              pagination={false}
              dataSource={files}
              columns={[
                { title: 'Workbook', key: 'name', render: (_, f) => f.file.name },
                { title: 'Size', key: 'size', render: (_, f) => bytes(f.file.size), width: 100 },
                {
                  title: 'Template',
                  key: 'kind',
                  width: 200,
                  render: (_, f) => (
                    <Select aria-label={`Template for ${f.file.name}`} value={f.kind} options={kinds} style={{ width: 170 }}
                      onChange={(k) => setFiles((prev) => prev.map((x) => (x.uid === f.uid ? { ...x, kind: k } : x)))} />
                  ),
                },
                {
                  title: '',
                  key: 'remove',
                  width: 90,
                  render: (_, f) => <Button size="small" onClick={() => setFiles((prev) => prev.filter((x) => x.uid !== f.uid))}>Remove</Button>,
                },
              ]}
            />
          )}
          {duplicateKinds && <Alert type="warning" showIcon message="Two workbooks have the same template type. Each type can be sent once per check." />}
          {busy && <Progress percent={busy.percent} status="active" format={() => busy.step} />}
          <Space>
            <Button type="primary" onClick={validate} disabled={!files.length || duplicateKinds || busy !== null || !target || closed}>
              Validate {files.length > 1 ? `${files.length} workbooks together` : 'workbook'}
            </Button>
            {files.length > 0 && !busy && <Button onClick={() => setFiles([])}>Clear</Button>}
          </Space>
        </Space>
      </Card>

      {result && (
        <>
          <CheckSummary check={result.check} />
          {result.datasets.map((r) => <DatasetResult key={r.dataset.id} r={r} onShowColumns={showColumns} />)}
        </>
      )}

      {target && (
        <Card title={`Checks of ${runLabel(target.run)}`} style={{ marginTop: 24 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            loading={checks.loading}
            dataSource={checks.data || []}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No checks yet." /> }}
            columns={[
              { title: 'Check', dataIndex: 'checkNo', width: 80 },
              { title: 'Result', dataIndex: 'status', render: (v) => statusTag[v] },
              { title: 'Readiness', dataIndex: 'readiness', align: 'right', render: (v) => <span className="db-code">{(Number(v) * 100).toFixed(1)}%</span> },
              { title: 'Rows', dataIndex: 'rows', align: 'right' },
              { title: 'Critical', dataIndex: 'critical', align: 'right' },
              { title: 'Warnings', dataIndex: 'warning', align: 'right' },
              { title: 'Checked', key: 'when', render: (_, c) => `${when(c.createdAt)} by ${c.createdBy}` },
              { title: '', key: 'open', align: 'right', render: (_, c) => <Link to={`/checks/${c.id}`}>Findings</Link> },
            ]}
          />
        </Card>
      )}

      {target && (
        <Card title="Workbooks received" style={{ marginTop: 24 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            loading={history.loading}
            dataSource={history.data || []}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing received for this run yet." /> }}
            columns={[
              { title: 'Template', dataIndex: 'kind', render: (v) => kindLabel[v] },
              { title: 'Version', dataIndex: 'versionNo', align: 'right' },
              { title: 'File', dataIndex: 'fileName' },
              {
                title: 'Read',
                key: 'status',
                render: (_, d) =>
                  d.status === 'SUCCEEDED'
                    ? <Tag color={d.warningCount ? 'orange' : 'green'}>{d.sheetCount} sheets{d.warningCount ? `, ${d.warningCount} structure warnings` : ''}</Tag>
                    : <Tag color="red">Could not be read</Tag>,
              },
              { title: 'Received', key: 'when', render: (_, d) => `${when(d.uploadedAt)} by ${d.uploadedBy}` },
              { title: 'SHA-256', dataIndex: 'sha256', render: (v) => <span className="db-code" style={{ whiteSpace: 'nowrap' }}>{shortHash(v)}</span> },
              {
                title: '',
                key: 'view',
                align: 'right',
                render: (_, d) => d.status === 'SUCCEEDED' && <Button size="small" onClick={() => showColumns(d.id, null)}>Sheets</Button>,
              },
            ]}
          />
        </Card>
      )}

      <Drawer
        width={Math.min(900, window.innerWidth)}
        open={Boolean(drawer)}
        onClose={() => setDrawer(null)}
        title={drawer ? (drawerSheet ? `${drawerSheet.sheetName}: columns` : `${drawer.schema.workbook}: sheets`) : ''}
      >
        {drawer && !drawerSheet && (
          <SheetResults
            sheets={drawer.schema.sheets.map((s) => ({
              sheetName: s.sheetName,
              tableName: s.tableName || s.purpose,
              tableId: s.tableId,
              captionRow: s.captionRow,
              columns: s.fields.length,
              typedColumns: s.fields.filter((f) => f.type !== 'UNKNOWN').length,
              warnings: s.warnings,
            }))}
            onShowColumns={(sheetName) => setDrawer({ ...drawer, sheetName })}
          />
        )}
        {drawerSheet && (
          <>
            <Button style={{ marginBottom: 16 }} onClick={() => setDrawer({ ...drawer, sheetName: null })}>All sheets</Button>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="BC table">{drawerSheet.tableName || drawerSheet.purpose || 'Not known'}</Descriptions.Item>
              <Descriptions.Item label="Table ID"><span className="db-code">{drawerSheet.tableId || '-'}</span></Descriptions.Item>
              <Descriptions.Item label="Caption row">{drawerSheet.captionRow}</Descriptions.Item>
              <Descriptions.Item label="Data starts on row">{drawerSheet.dataStartRow}</Descriptions.Item>
            </Descriptions>
            <SheetColumns sheet={drawerSheet} />
          </>
        )}
      </Drawer>
    </div>
  )
}
