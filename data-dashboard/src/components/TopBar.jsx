import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Badge, Button, Grid, Input, Layout, Popover, Space, Tooltip, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { health } from '../api/databridge'
import { setActor } from '../redux/sessionSlice'

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
        Your name goes into the audit trail with every change. Sign-in replaces this later.
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

export default function TopBar() {
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
      <ActorPicker compact={!wide} />
    </Header>
  )
}
