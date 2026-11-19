import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Badge, Button, Dropdown, Grid, Input, Layout, Modal, Popover, Space, Tooltip, Typography } from 'antd'
import { DownOutlined, UserOutlined } from '@ant-design/icons'
import { health, logout } from '../api/databridge'
import { setActor, signedOut } from '../redux/sessionSlice'
import ChangePassword from '../pages/ChangePassword'

const { Header } = Layout
const POLL_MS = 15000

/** Checks /health now and every 15 seconds. */
function useServerStatus() {
  const [status, setStatus] = useState({ state: 'checking' })
  useEffect(() => {
    let alive = true
    const check = () =>
      health().then(
        (h) => alive && setStatus({ state: h.database === 'UP' ? 'up' : 'degraded' }),
        () => alive && setStatus({ state: 'down' }),
      )
    check()
    const t = setInterval(check, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  return status
}

const statusText = {
  checking: ['processing', 'Checking server'],
  up: ['success', 'Server connected'],
  degraded: ['warning', 'Server up, database not answering'],
  down: ['error', 'Server not reachable'],
}

function ActorPicker({ compact }) {
  const actor = useSelector((s) => s.session.actor)
  const dispatch = useDispatch()
  const [open, setOpen] = useState(!actor)
  const [draft, setDraft] = useState(actor)

  const save = () => {
    dispatch(setActor(draft))
    setOpen(false)
  }

  const content = (
    <Space direction="vertical" style={{ width: 260 }}>
      <Typography.Text type="secondary">
        Sign-in is off (development mode). Your name goes into the audit trail with every change.
      </Typography.Text>
      <Input
        aria-label="Your name"
        placeholder="e.g. Harrison Mwakisaghu"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onPressEnter={save}
        maxLength={100}
      />
      <Button type="primary" onClick={save} disabled={!draft.trim()}>
        Use this name
      </Button>
    </Space>
  )

  return (
    <Popover content={content} title="Who is working?" trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Button icon={<UserOutlined />} aria-label={compact ? (actor ? `Acting as ${actor}` : 'Set your name') : undefined}>
        {compact ? null : actor ? `Acting as ${actor}` : 'Set your name'}
      </Button>
    </Popover>
  )
}

const roleNames = { ADMIN: 'Administrator', CONSULTANT: 'Consultant', REVIEWER: 'Reviewer', FINANCE: 'Finance', VIEWER: 'Viewer' }

/** The signed-in user, with change-password and sign-out. */
function UserMenu({ compact }) {
  const user = useSelector((s) => s.session.user)
  const dispatch = useDispatch()
  const [changing, setChanging] = useState(false)
  const items = [
    { key: 'who', disabled: true, label: <span>{user.username} · {user.roles.map((r) => roleNames[r] || r).join(', ')}</span> },
    { type: 'divider' },
    { key: 'password', label: 'Change password' },
    { key: 'out', label: 'Sign out' },
  ]
  const onClick = ({ key }) => {
    if (key === 'password') setChanging(true)
    if (key === 'out') logout().finally(() => dispatch(signedOut()))
  }
  return (
    <>
      <Dropdown menu={{ items, onClick }} trigger={['click']} placement="bottomRight">
        <Button icon={<UserOutlined />} aria-label={compact ? `Signed in as ${user.displayName}` : undefined}>
          {compact ? null : <>{user.displayName} <DownOutlined /></>}
        </Button>
      </Dropdown>
      <Modal open={changing} title="Change password" footer={null} onCancel={() => setChanging(false)} destroyOnClose>
        <ChangePassword onDone={() => setChanging(false)} />
      </Modal>
    </>
  )
}

export default function TopBar() {
  const local = useSelector((s) => s.session.authMode === 'local')
  const status = useServerStatus()
  const [badge, text] = statusText[status.state]
  const wide = Grid.useBreakpoint().md
  return (
    <Header
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 24,
        padding: wide ? '0 32px' : '0 16px',
        borderBottom: '1px solid #DDE1E6',
        height: 56,
      }}
    >
      <Tooltip title={status.state === 'down' ? 'Start the server: java -jar databridge-app/target/databridge-app.jar' : wide ? null : text}>
        <span role="status" aria-label={text}>
          <Badge status={badge} text={wide ? text : null} />
        </span>
      </Tooltip>
      {local ? <UserMenu compact={!wide} /> : <ActorPicker compact={!wide} />}
    </Header>
  )
}
