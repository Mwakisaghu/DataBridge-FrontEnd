import { useState } from 'react'
import { App, Button, Card, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { downloadAudit, getAudit, getSetup, purgeAll } from '../api/databridge'
import { bytes, when } from '../format'

const areas = [
  { value: '', label: 'Everything' },
  { value: 'CLIENT', label: 'Clients' },
  { value: 'PROJECT', label: 'Projects' },
  { value: 'RUN', label: 'Runs' },
  { value: 'DATASET', label: 'Uploads' },
  { value: 'SETUP', label: 'Setups' },
  { value: 'WORKSPACE', label: 'Client files' },
]

const actionColour = (a) =>
  a.includes('DELETED') || a.includes('PURGED') ? 'volcano' : a.includes('SETUP') || a.includes('IMPORTED') ? 'blue' : 'default'

const actionText = (a) => a.charAt(0) + a.slice(1).toLowerCase().replace(/_/g, ' ')

/** Clearing client files on demand. Exported for tests. */
export function ClientFiles({ onPurged }) {
  const { message } = App.useApp()
  const setup = useLoad(getSetup)
  const [busy, setBusy] = useState(false)
  const r = setup.data?.retention
  const policy = !r
    ? ''
    : r.mode === 'PURGE_ON_COMPLETE'
      ? 'Client files are destroyed as soon as each upload has been read.'
      : `Client files are kept for ${r.keepHours} hours for review, then destroyed.`

  const purge = async () => {
    setBusy(true)
    try {
      const p = await purgeAll()
      message.success(
        p.workspaces === 0
          ? 'There were no client files to clear'
          : `Cleared ${p.files} file${p.files === 1 ? '' : 's'} (${bytes(p.bytes)}) from ${p.workspaces} workspace${p.workspaces === 1 ? '' : 's'}`,
      )
      onPurged?.()
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Client files" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Paragraph style={{ margin: 0, maxWidth: 640 }}>
          DataBridge keeps no client data in its database. {policy} Use this to destroy every client file
          on the server now, for example at the end of an engagement.
        </Typography.Paragraph>
        <Popconfirm
          title="Clear all client files now?"
          description="Every workspace on the server is destroyed. Records and the audit trail stay."
          okText="Clear all client files"
          okButtonProps={{ danger: true }}
          onConfirm={purge}
        >
          <Button danger loading={busy}>Clear all client files</Button>
        </Popconfirm>
      </div>
    </Card>
  )
}

export default function Audit() {
  const { message } = App.useApp()
  const [area, setArea] = useState('')
  const [limit, setLimit] = useState(100)
  const audit = useLoad(() => getAudit({ entityType: area || undefined, limit }), [area, limit])

  return (
    <div className="db-page">
      <PageHeader title="Audit and retention" description="Who did what, and when. Entries are never edited or deleted." />
      <ClientFiles onPurged={audit.reload} />
      <LoadError error={audit.error} onRetry={audit.reload} />
      <Card
        title="Audit trail"
        styles={{ body: { padding: 0 } }}
        extra={
          <Space wrap>
            <Select aria-label="Show" value={area} onChange={setArea} options={areas} style={{ width: 150 }} />
            <Select
              aria-label="How many"
              value={limit}
              onChange={setLimit}
              style={{ width: 130 }}
              options={[50, 100, 500, 1000].map((n) => ({ value: n, label: `Latest ${n}` }))}
            />
            <Button icon={<DownloadOutlined />} onClick={() => downloadAudit({ entityType: area || undefined, limit }).catch((e) => message.error(e.message))}>
              Export
            </Button>
            <Button icon={<ReloadOutlined />} onClick={audit.reload} aria-label="Refresh" />
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={audit.loading}
          dataSource={audit.data || []}
          pagination={{ pageSize: 25, hideOnSinglePage: true }}
          scroll={{ x: true }}
          columns={[
            { title: 'When', dataIndex: 'occurredAt', width: 190, render: when },
            { title: 'Who', dataIndex: 'actor', width: 200, render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span> },
            { title: 'Action', dataIndex: 'action', width: 220, render: (a) => <Tag color={actionColour(a)}>{actionText(a)}</Tag> },
            { title: 'Details', dataIndex: 'details' },
          ]}
        />
      </Card>
    </div>
  )
}
