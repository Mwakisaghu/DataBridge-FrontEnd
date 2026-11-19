import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Col, DatePicker, Empty, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import { validated } from '../formValidation'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { closeRun, createClient, createProject, getOverview, openRun } from '../api/databridge'
import { day, runLabel } from '../format'

/** A small form in a modal. `onSubmit` returns a promise; errors stay in the modal. */
function FormModal({ title, okText, open, onClose, onSubmit, children }) {
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async () => {
    const values = await validated(form)
    if (!values) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(values)
      form.resetFields()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={title} open={open} okText={okText} onOk={submit} confirmLoading={busy} onCancel={onClose} destroyOnClose>
      <Form form={form} layout="vertical" requiredMark={false} preserve={false}>
        {children}
      </Form>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </Modal>
  )
}

const codeRule = [
  { required: true, message: 'Enter a code' },
  { pattern: /^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$/, message: '2 to 20 letters, digits, - or _' },
]

function Figures({ overview }) {
  const f = useMemo(() => {
    const projects = overview.flatMap((c) => c.projects)
    const runs = projects.flatMap((p) => p.runs)
    return {
      clients: overview.length,
      projects: projects.length,
      openRuns: runs.filter((r) => r.run.state === 'OPEN').length,
      uploads: runs.reduce((a, r) => a + r.datasets, 0),
      failed: runs.reduce((a, r) => a + r.failedDatasets, 0),
    }
  }, [overview])
  return (
    <Card style={{ marginBottom: 24 }}>
      <Row gutter={[24, 16]}>
        <Col xs={12} md={5}><Statistic title="Clients" value={f.clients} /></Col>
        <Col xs={12} md={5}><Statistic title="Projects" value={f.projects} /></Col>
        <Col xs={12} md={5}><Statistic title="Open runs" value={f.openRuns} /></Col>
        <Col xs={12} md={5}><Statistic title="Template uploads" value={f.uploads} /></Col>
        <Col xs={12} md={4}>
          <Statistic title="Uploads that failed" value={f.failed} valueStyle={f.failed ? { color: '#A4231A' } : undefined} />
        </Col>
      </Row>
    </Card>
  )
}

function Runs({ project, onOpenRun, onChanged }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const close = async (run) => {
    try {
      await closeRun(run.id)
      message.success(`${runLabel(run)} closed`)
      onChanged()
    } catch (e) {
      message.error(e.message)
    }
  }
  const columns = [
    {
      title: 'Run',
      key: 'run',
      render: (_, r) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{runLabel(r.run)}</span>
          {r.run.type === 'CUTOVER' && <Tag color="purple">Cutover</Tag>}
        </Space>
      ),
    },
    { title: 'Cutoff date', key: 'cutoff', render: (_, r) => day(r.run.cutoffDate) },
    {
      title: 'State',
      key: 'state',
      render: (_, r) => (r.run.state === 'OPEN' ? <Tag color="green">Open</Tag> : <Tag>Closed</Tag>),
    },
    {
      title: 'Uploads',
      key: 'uploads',
      render: (_, r) => (
        <span className="db-code">
          {r.datasets}
          {r.failedDatasets > 0 && <Typography.Text type="danger"> ({r.failedDatasets} failed)</Typography.Text>}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, r) =>
        r.run.state === 'OPEN' ? (
          <Space>
            <Button size="small" type="primary" ghost onClick={() => navigate(`/intake?run=${r.run.id}`)}>
              Upload templates
            </Button>
            <Popconfirm title={`Close ${runLabel(r.run)}?`} description="A closed run takes no more uploads." okText="Close run" onConfirm={() => close(r.run)}>
              <Button size="small">Close run</Button>
            </Popconfirm>
          </Space>
        ) : (
          <Button size="small" onClick={() => navigate(`/intake?run=${r.run.id}`)}>View uploads</Button>
        ),
    },
  ]
  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space direction="vertical" size={0} style={{ padding: '6px 0' }}>
          <span>{project.project.name}</span>
          <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
            <span className="db-code">{project.project.code}</span>
            {project.project.bcCompany && <> in BC company {project.project.bcCompany}</>}
          </Typography.Text>
        </Space>
      }
      extra={<Button size="small" icon={<PlusOutlined />} onClick={() => onOpenRun(project.project)}>Open run</Button>}
    >
      <Table
        rowKey={(r) => r.run.id}
        size="small"
        columns={columns}
        dataSource={project.runs}
        pagination={false}
        locale={{ emptyText: 'No runs yet. Open a mock run to start uploading templates.' }}
        scroll={{ x: true }}
      />
    </Card>
  )
}

export default function ControlCentre() {
  const { message } = App.useApp()
  const { data: overview = [], loading, error, reload } = useLoad(getOverview)
  const [selectedId, setSelectedId] = useState(null)
  const [dialog, setDialog] = useState(null) // { kind: 'client' | 'project' | 'run', project? }

  const selected = overview.find((c) => c.client.id === selectedId) || overview[0]

  const clientColumns = [
    { title: 'Code', dataIndex: ['client', 'code'], key: 'code', render: (v) => <span className="db-code">{v}</span>, width: 120 },
    { title: 'Client', dataIndex: ['client', 'name'], key: 'name' },
    {
      title: 'Open runs',
      key: 'open',
      align: 'right',
      render: (_, c) => c.projects.flatMap((p) => p.runs).filter((r) => r.run.state === 'OPEN').length,
    },
  ]

  return (
    <div className="db-page">
      <PageHeader
        title="Migration Control Centre"
        description="Clients, their migration projects and the runs within each project."
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setDialog({ kind: 'client' })}>Add client</Button>}
      />
      <LoadError error={error} onRetry={reload} />
      <Figures overview={overview} />

      <Row gutter={24}>
        <Col xs={24} lg={9}>
          <Card title="Clients" styles={{ body: { padding: 0 } }} style={{ marginBottom: 24 }}>
            <Table
              rowKey={(c) => c.client.id}
              columns={clientColumns}
              dataSource={overview}
              loading={loading}
              pagination={false}
              size="middle"
              rowClassName={() => 'db-clickable'}
              onRow={(c) => ({ onClick: () => setSelectedId(c.client.id), style: { cursor: 'pointer', background: selected && c.client.id === selected.client.id ? '#EEF6F6' : undefined } })}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No clients yet. Add the first SACCO you are migrating." /> }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          {selected ? (
            <Card
              title={selected.client.name}
              extra={<Button icon={<PlusOutlined />} onClick={() => setDialog({ kind: 'project' })}>Add project</Button>}
              styles={{ body: { paddingBottom: 8 } }}
            >
              {selected.projects.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No projects yet. Add the migration project for this client." />
              ) : (
                selected.projects.map((p) => (
                  <Runs key={p.project.id} project={p} onOpenRun={(project) => setDialog({ kind: 'run', project })} onChanged={reload} />
                ))
              )}
            </Card>
          ) : (
            !loading && <Card><Empty description="Add a client to see its projects and runs here." /></Card>
          )}
        </Col>
      </Row>

      <FormModal
        title="Add client"
        okText="Add client"
        open={dialog?.kind === 'client'}
        onClose={() => setDialog(null)}
        onSubmit={async (v) => {
          const c = await createClient(v)
          message.success(`${c.name} added`)
          setSelectedId(c.id)
          await reload()
        }}
      >
        <Form.Item name="code" label="Client code" rules={codeRule} extra="Short and unique, e.g. AZIMA. Stored in capitals.">
          <Input autoFocus />
        </Form.Item>
        <Form.Item name="name" label="Client name" rules={[{ required: true, message: 'Enter the client name' }]}>
          <Input placeholder="e.g. AZIMA DT SACCO" />
        </Form.Item>
      </FormModal>

      <FormModal
        title={`Add project for ${selected?.client.name || ''}`}
        okText="Add project"
        open={dialog?.kind === 'project'}
        onClose={() => setDialog(null)}
        onSubmit={async (v) => {
          const p = await createProject(selected.client.id, v)
          message.success(`${p.name} added`)
          await reload()
        }}
      >
        <Form.Item name="code" label="Project code" rules={codeRule}>
          <Input autoFocus placeholder="e.g. BC-2026" />
        </Form.Item>
        <Form.Item name="name" label="Project name" rules={[{ required: true, message: 'Enter the project name' }]}>
          <Input placeholder="e.g. Business Central go-live" />
        </Form.Item>
        <Form.Item name="bcCompany" label="Business Central company (optional)">
          <Input />
        </Form.Item>
      </FormModal>

      <FormModal
        title={`Open a run in ${dialog?.project?.name || ''}`}
        okText="Open run"
        open={dialog?.kind === 'run'}
        onClose={() => setDialog(null)}
        onSubmit={async (v) => {
          const run = await openRun(dialog.project.id, { type: v.type, cutoffDate: v.cutoffDate.format('YYYY-MM-DD') })
          message.success(`${runLabel(run)} opened`)
          await reload()
        }}
      >
        <Form.Item name="type" label="Run type" initialValue="MOCK">
          <Select
            options={[
              { value: 'MOCK', label: 'Mock run: a rehearsal' },
              { value: 'CUTOVER', label: 'Cutover run: the real migration' },
            ]}
          />
        </Form.Item>
        <Form.Item name="cutoffDate" label="Cutoff date" rules={[{ required: true, message: 'Pick the cutoff date of the balances' }]}>
          <DatePicker style={{ width: '100%' }} format="D MMM YYYY" />
        </Form.Item>
      </FormModal>
    </div>
  )
}
