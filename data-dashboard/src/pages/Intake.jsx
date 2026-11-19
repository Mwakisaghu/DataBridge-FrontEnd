import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, App, Button, Card, Cascader, Descriptions, Drawer, Empty, Progress, Segmented, Space, Table, Tag, Typography, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { getDatasets, getOverview, getSchema, uploadDataset } from '../api/databridge'
import { bytes, day, kindLabel, runLabel, shortHash, when } from '../format'

const kinds = Object.entries(kindLabel).map(([value, label]) => ({ value, label }))

/** client > project > run options; closed runs can be viewed but not uploaded to. */
function runOptions(overview) {
  return overview.map((c) => ({
    value: c.client.id,
    label: c.client.name,
    children: c.projects.map((p) => ({
      value: p.project.id,
      label: p.project.name,
      children: p.runs.map((r) => ({
        value: r.run.id,
        label: `${runLabel(r.run)}, cutoff ${day(r.run.cutoffDate)}${r.run.state === 'CLOSED' ? ' (closed)' : ''}`,
      })),
    })),
  }))
}

function findRun(overview, runId) {
  for (const c of overview) for (const p of c.projects) for (const r of p.runs) {
    if (r.run.id === runId) return { client: c.client, project: p.project, run: r.run }
  }
  return null
}

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

function UploadResult({ result, onShowColumns }) {
  const d = result.dataset
  return (
    <Card style={{ marginTop: 24 }} title={`${d.fileName}, version ${d.versionNo}`}>
      {result.ok ? (
        <Alert
          type={d.warningCount ? 'warning' : 'success'}
          showIcon
          style={{ marginBottom: 16 }}
          message={`Read ${d.sheetCount} sheet${d.sheetCount === 1 ? '' : 's'}${d.warningCount ? ` with ${d.warningCount} warning${d.warningCount === 1 ? '' : 's'}` : ' with no warnings'}.`}
          description={d.warningCount ? 'Open a sheet with warnings to see what to fix in the template or in Template Setup.' : 'The file itself has been destroyed; only its structure was kept.'}
        />
      ) : (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="This workbook could not be read. It is recorded as a failed upload."
          description={d.error}
        />
      )}
      <Descriptions size="small" column={{ xs: 1, md: 3 }} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Template">{kindLabel[d.kind]}</Descriptions.Item>
        <Descriptions.Item label="Size">{bytes(d.sizeBytes)}</Descriptions.Item>
        <Descriptions.Item label="SHA-256">
          {d.sha256 ? (
            <Typography.Text className="db-code" copyable={{ text: d.sha256 }}>{shortHash(d.sha256)}</Typography.Text>
          ) : '-'}
        </Descriptions.Item>
      </Descriptions>
      {result.ok && <SheetResults sheets={result.sheets} onShowColumns={onShowColumns} />}
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

  const [kind, setKind] = useState('STATIC')
  const [progress, setProgress] = useState(null)
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

  const upload = async ({ file, onSuccess, onError }) => {
    setResult(null)
    setProgress(0)
    try {
      const r = await uploadDataset(runId, kind, file, setProgress)
      setResult(r)
      if (r.ok) message.success(`${file.name} read as version ${r.dataset.versionNo}`)
      else message.error(`${file.name} could not be read`)
      onSuccess(r)
      history.reload()
    } catch (e) {
      message.error(e.message)
      onError(e)
    } finally {
      setProgress(null)
    }
  }

  const selectedPath = target ? [target.client.id, target.project.id, target.run.id] : []
  const closed = target?.run.state === 'CLOSED'
  const drawerSheet = drawer?.schema.sheets.find((s) => s.sheetName === drawer.sheetName)

  return (
    <div className="db-page">
      <PageHeader
        title="Template intake"
        description="Upload a client's filled-in templates to a run. DataBridge reads each sheet's structure, records it, and destroys the file."
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
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Template</Typography.Text>
            <div style={{ overflowX: 'auto' }}>
              <Segmented options={kinds} value={kind} onChange={setKind} />
            </div>
          </div>
          {closed && <Alert type="info" showIcon message="This run is closed. Its uploads are listed below; open a new run to upload more." />}
          <Upload.Dragger
            accept=".xlsx,.xlsm"
            multiple={false}
            showUploadList={false}
            customRequest={upload}
            disabled={!target || closed || progress !== null}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">
              {target ? `Drop the ${kindLabel[kind].toLowerCase()} data workbook here, or click to choose it` : 'Choose a run first'}
            </p>
            <p className="ant-upload-hint">Excel .xlsx or .xlsm. The file is streamed to a temporary workspace and destroyed after reading.</p>
          </Upload.Dragger>
          {progress !== null && <Progress percent={progress} status="active" />}
        </Space>
      </Card>

      {result && <UploadResult result={result} onShowColumns={(sheet) => showColumns(result.dataset.id, sheet)} />}

      {target && (
        <Card title={`Uploads to ${runLabel(target.run)}`} style={{ marginTop: 24 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            loading={history.loading}
            dataSource={history.data || []}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing uploaded to this run yet." /> }}
            columns={[
              { title: 'Template', dataIndex: 'kind', render: (v) => kindLabel[v] },
              { title: 'Version', dataIndex: 'versionNo', align: 'right' },
              { title: 'File', dataIndex: 'fileName' },
              {
                title: 'Result',
                key: 'status',
                render: (_, d) =>
                  d.status === 'SUCCEEDED'
                    ? <Tag color={d.warningCount ? 'orange' : 'green'}>{d.sheetCount} sheets{d.warningCount ? `, ${d.warningCount} warnings` : ''}</Tag>
                    : <Tag color="red">Could not be read</Tag>,
              },
              { title: 'Uploaded', key: 'when', render: (_, d) => `${when(d.uploadedAt)} by ${d.uploadedBy}` },
              { title: 'SHA-256', dataIndex: 'sha256', render: (v) => <span className="db-code" style={{ whiteSpace: 'nowrap' }}>{shortHash(v)}</span> },
              {
                title: '',
                key: 'view',
                align: 'right',
                render: (_, d) =>
                  d.status === 'SUCCEEDED' && (
                    <Button size="small" onClick={() => showColumns(d.id, null)}>Sheets</Button>
                  ),
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
            {drawer.sheetName && (
              <Button style={{ marginBottom: 16 }} onClick={() => setDrawer({ ...drawer, sheetName: null })}>All sheets</Button>
            )}
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
