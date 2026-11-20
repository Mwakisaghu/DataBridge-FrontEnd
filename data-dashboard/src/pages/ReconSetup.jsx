import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Alert, App, Button, Card, Descriptions, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { deleteControl, getReconSetup, putControl, putTrialBalance, resetTrialBalance } from '../api/databridge'
import { hasRole } from '../redux/sessionSlice'

const NEW_CONTROL = {
  id: 'bank-nyota',
  glAccount: '104101',
  name: 'Nyota Bank Current Account',
  normal: 'DEBIT',
  tolerance: 0,
  enabled: true,
  sources: [{ sheet: 'BANK BALANCES', amountField: 'Balance as at cutoff date', whereField: 'No', whereEquals: 'BNK001' }],
}

const describe = (s) =>
  `${s.sheet} / ${s.amountField}${s.whereField && s.whereEquals ? ` where ${s.whereField} = ${s.whereEquals}` : ''}${s.whereField && s.whereEndsWith ? ` where ${s.whereField} ends ${s.whereEndsWith}` : ''}`

/** Setup tab: the Reconciliation Setup — trial balance layout and control accounts. */
export default function ReconSetup() {
  const { message } = App.useApp()
  const setup = useLoad(getReconSetup)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const admin = !local || hasRole(user, 'ADMIN')
  const [editing, setEditing] = useState(null) // { text, kind: 'control' | 'tb' }
  const [busy, setBusy] = useState(false)

  const run = async (fn, ok) => {
    try {
      await fn()
      message.success(ok)
      await setup.reload()
      return true
    } catch (e) {
      message.error(e.message)
      return false
    }
  }

  const saveEditor = async () => {
    let value
    try {
      value = JSON.parse(editing.text)
    } catch {
      message.error('That is not valid JSON')
      return
    }
    setBusy(true)
    const done = editing.kind === 'tb'
      ? await run(() => putTrialBalance(value), 'Trial balance layout saved')
      : await run(() => putControl(value), `Control ${value.id} saved`)
    setBusy(false)
    if (done) setEditing(null)
  }

  if (setup.error) return <LoadError error={setup.error} onRetry={setup.reload} />
  const v = setup.data
  const tb = v?.trialBalance

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="Every submission is reconciled with this setup: the trial balance must balance, and each control account's GL balance must equal the total of its subledger sheets. Shipped defaults fit the SACCO templates; stored entries override them by id."
      />
      <Card
        title="Trial balance"
        loading={setup.loading}
        extra={admin && tb && (
          <Space>
            {v.trialBalanceStored && (
              <Popconfirm title="Go back to the shipped layout?" onConfirm={() => run(resetTrialBalance, 'Shipped layout restored')}>
                <Button>Reset</Button>
              </Popconfirm>
            )}
            <Button onClick={() => setEditing({ kind: 'tb', text: JSON.stringify(tb, null, 2) })}>Edit</Button>
          </Space>
        )}
      >
        {tb && (
          <Descriptions size="small" column={{ xs: 1, md: 3 }}>
            <Descriptions.Item label="Sheet">{tb.sheet}</Descriptions.Item>
            <Descriptions.Item label="Account column">{tb.accountField}</Descriptions.Item>
            <Descriptions.Item label="Debit / credit">{tb.debitField} / {tb.creditField}</Descriptions.Item>
            <Descriptions.Item label="Tolerance">{tb.tolerance}</Descriptions.Item>
            <Descriptions.Item label="Source">{v.trialBalanceStored ? <Tag color="blue">Stored</Tag> : <Tag>Shipped</Tag>}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
      <Card
        title="Control accounts"
        styles={{ body: { padding: 0 } }}
        extra={admin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ kind: 'control', text: JSON.stringify(NEW_CONTROL, null, 2) })}>
            Add control
          </Button>
        )}
      >
        <Table
          rowKey={(c) => c.control.id}
          loading={setup.loading}
          dataSource={v?.controls || []}
          pagination={false}
          scroll={{ x: 820 }}
          columns={[
            { title: 'GL account', key: 'gl', render: (_, c) => <span className="db-code">{c.control.glAccount}</span> },
            { title: 'Name', key: 'n', render: (_, c) => <>{c.control.name}<div><Typography.Text type="secondary" className="db-code">{c.control.id}</Typography.Text></div></> },
            { title: 'Normal side', key: 'side', render: (_, c) => (c.control.normal === 'DEBIT' ? 'Debit' : 'Credit') },
            { title: 'Subledgers', key: 'src', render: (_, c) => c.control.sources.map((s) => <div key={describe(s)}>{describe(s)}</div>) },
            { title: 'Tolerance', key: 't', align: 'right', render: (_, c) => c.control.tolerance },
            {
              title: 'On', key: 'on',
              render: (_, c) => (
                <Switch
                  size="small"
                  checked={c.control.enabled}
                  disabled={!admin}
                  aria-label={`Check ${c.control.name}`}
                  onChange={(on) => run(() => putControl({ ...c.control, enabled: on }), `${c.control.name} ${on ? 'switched on' : 'switched off'}`)}
                />
              ),
            },
            { title: 'Source', key: 'from', render: (_, c) => (c.stored ? <Tag color="blue">{c.shipped ? 'Changed' : 'Added'}</Tag> : <Tag>Shipped</Tag>) },
            {
              title: '', key: 'a', align: 'right',
              render: (_, c) => admin && (
                <Space>
                  <Button size="small" onClick={() => setEditing({ kind: 'control', text: JSON.stringify(c.control, null, 2) })}>Edit</Button>
                  {c.stored && (
                    <Popconfirm title={c.shipped ? 'Go back to the shipped definition?' : 'Remove this control?'} onConfirm={() => run(() => deleteControl(c.control.id), 'Removed')}>
                      <Button size="small">{c.shipped ? 'Reset' : 'Remove'}</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        open={Boolean(editing)}
        title={editing?.kind === 'tb' ? 'Trial balance layout' : 'Control account'}
        okText="Save"
        onOk={saveEditor}
        confirmLoading={busy}
        onCancel={() => setEditing(null)}
        width={720}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          {editing?.kind === 'tb'
            ? 'Sheet and column captions of the trial balance, and how far debits and credits may differ.'
            : 'normal is DEBIT or CREDIT. Each subledger sums amountField of sheet, optionally only rows whose whereField equals whereEquals or ends with whereEndsWith.'}
        </Typography.Paragraph>
        <Input.TextArea
          aria-label="Definition"
          className="db-code"
          rows={16}
          value={editing?.text}
          onChange={(e) => setEditing((x) => ({ ...x, text: e.target.value }))}
        />
      </Modal>
    </Space>
  )
}
