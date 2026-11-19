import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Alert, App, Button, Card, Checkbox, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { createUser, getUsers, resetUserPassword, updateUser } from '../api/databridge'
import { when } from '../format'
import { hasRole } from '../redux/sessionSlice'

const ROLES = [
  { value: 'ADMIN', label: 'Administrator', help: 'Users, setups, rules, clearing client files. Holds every other role.' },
  { value: 'CONSULTANT', label: 'Consultant', help: 'Clients, projects, runs, submissions; requests waivers.' },
  { value: 'REVIEWER', label: 'Reviewer', help: 'Decides waivers; reviews runs.' },
  { value: 'FINANCE', label: 'Finance', help: 'Explains and approves reconciliation variances; approves sign-off.' },
  { value: 'VIEWER', label: 'Viewer', help: 'Reads everything, changes nothing.' },
]
const roleLabel = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

function RoleBoxes() {
  return (
    <Checkbox.Group style={{ display: 'grid', gap: 8 }}>
      {ROLES.map((r) => (
        <Checkbox key={r.value} value={r.value}>
          <strong>{r.label}</strong> <Typography.Text type="secondary">{r.help}</Typography.Text>
        </Checkbox>
      ))}
    </Checkbox.Group>
  )
}

/** Shows a temporary password once, for the administrator to pass on. */
function IssuedPassword({ issued, onClose }) {
  return (
    <Modal open={Boolean(issued)} title="Temporary password" onCancel={onClose} footer={<Button type="primary" onClick={onClose}>Done</Button>}>
      {issued && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Paragraph>
            Give this to <strong>{issued.user.displayName}</strong> ({issued.user.username}) in person or over a trusted channel.
            They must choose their own password when they first sign in. It is not shown again.
          </Typography.Paragraph>
          <Typography.Text code copyable style={{ fontSize: 18 }} aria-label="Temporary password">{issued.temporaryPassword}</Typography.Text>
        </Space>
      )}
    </Modal>
  )
}

function UserDialog({ editing, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const isNew = editing === 'new'

  const save = async (v) => {
    setBusy(true)
    setError(null)
    try {
      const r = isNew
        ? await createUser({ username: v.username, displayName: v.displayName, roles: v.roles })
        : await updateUser(editing.id, { displayName: v.displayName, roles: v.roles, active: v.active })
      onSaved(isNew ? r : null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(editing)}
      title={isNew ? 'Add a user' : `Edit ${editing?.username}`}
      onCancel={onClose}
      okText={isNew ? 'Add user' : 'Save'}
      onOk={() => form.submit()}
      confirmLoading={busy}
      destroyOnClose
      width={560}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={save}
        initialValues={isNew ? { roles: ['CONSULTANT'], active: true } : { displayName: editing?.displayName, roles: editing?.roles, active: editing?.active }}
      >
        {isNew && (
          <Form.Item label="User name" name="username" extra="What they type to sign in, e.g. jane.doe"
            rules={[{ required: true, message: 'Give a user name' }, { pattern: /^[A-Za-z0-9._@-]{2,60}$/, message: '2-60 letters, digits, . _ - or @' }]}>
            <Input autoComplete="off" />
          </Form.Item>
        )}
        <Form.Item label="Full name" name="displayName" rules={[{ required: true, message: 'Give their name' }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="Roles" name="roles" rules={[{ required: true, type: 'array', min: 1, message: 'Pick at least one role' }]}>
          <RoleBoxes />
        </Form.Item>
        {!isNew && (
          <Form.Item label="Active" name="active" valuePropName="checked" extra="A disabled user cannot sign in and is signed out at once.">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

export default function Users() {
  const me = useSelector((s) => s.session.user)
  const { message } = App.useApp()
  const admin = hasRole(me, 'ADMIN')
  const users = useLoad(() => (admin ? getUsers() : []), [admin])
  const [editing, setEditing] = useState(null)
  const [issued, setIssued] = useState(null)

  if (!admin) {
    return (
      <div className="db-page">
        <PageHeader title="Users" />
        <Alert type="info" showIcon message="Only administrators manage users." />
      </div>
    )
  }

  const reset = async (u) => {
    try {
      setIssued(await resetUserPassword(u.id))
      users.reload()
    } catch (e) {
      message.error(e.message)
    }
  }

  return (
    <div className="db-page">
      <PageHeader
        title="Users"
        description="Who may sign in to DataBridge and what each person may do. Every change is in the audit trail."
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>Add user</Button>}
      />
      {users.error && <LoadError error={users.error} onRetry={users.reload} />}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={users.loading}
          dataSource={users.data || []}
          pagination={false}
          scroll={{ x: 760 }}
          columns={[
            { title: 'User', key: 'u', render: (_, u) => (<><div>{u.displayName}</div><Typography.Text type="secondary">{u.username}</Typography.Text></>) },
            { title: 'Roles', dataIndex: 'roles', render: (rs) => rs.map((r) => <Tag key={r}>{roleLabel[r] || r}</Tag>) },
            {
              title: 'Status', key: 's',
              render: (_, u) => !u.active ? <Tag>Disabled</Tag> : u.mustChangePassword ? <Tag color="gold">Temporary password</Tag> : <Tag color="green">Active</Tag>,
            },
            { title: 'Last sign-in', dataIndex: 'lastLoginAt', render: (v) => (v ? when(v) : 'Never') },
            {
              title: '', key: 'act', align: 'right',
              render: (_, u) => (
                <Space>
                  <Button size="small" onClick={() => setEditing(u)}>Edit</Button>
                  <Popconfirm title={`Issue a new temporary password for ${u.username}?`} description="They are signed out everywhere." okText="Reset" onConfirm={() => reset(u)}>
                    <Button size="small">Reset password</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <UserDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(r) => {
          setEditing(null)
          users.reload()
          if (r) setIssued(r)
          else message.success('User saved')
        }}
      />
      <IssuedPassword issued={issued} onClose={() => setIssued(null)} />
    </div>
  )
}
