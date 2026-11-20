import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Alert, App, Button, Card, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { deleteCleaningRule, getCleaningRules, putCleaningRule } from '../api/databridge'
import { hasRole } from '../redux/sessionSlice'

const NEW_RULE = { id: 'members.account-no', sheet: 'Members', field: 'No.', action: 'PAD_LEFT', length: 6, value: '0', enabled: true,
  description: 'Member numbers that lost their leading zeros' }

/** Setup tab: the Cleaning Setup, in the order the rules run. */
export default function CleaningSetup() {
  const { message } = App.useApp()
  const rules = useLoad(getCleaningRules)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const admin = !local || hasRole(user, 'ADMIN')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const save = async (rule) => {
    try {
      await putCleaningRule(rule)
      message.success(`Rule ${rule.id} saved`)
      await rules.reload()
      return true
    } catch (e) {
      message.error(e.message)
      return false
    }
  }

  const saveEditor = async () => {
    let rule
    try {
      rule = JSON.parse(editing)
    } catch {
      message.error('That is not valid JSON')
      return
    }
    setBusy(true)
    if (await save(rule)) setEditing(null)
    setBusy(false)
  }

  if (rules.error) return <LoadError error={rules.error} onRetry={rules.reload} />
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="Cleaning changes only what is certain: spaces and capitals, Kenyan phone numbers, option values that differ only in case or by one clear misspelling, and rows identical in every column. Anything that needs a person's judgement stays a finding."
      />
      <Card
        title="Cleaning rules"
        styles={{ body: { padding: 0 } }}
        extra={admin && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(JSON.stringify(NEW_RULE, null, 2))}>Add rule</Button>}
      >
        <Table
          rowKey={(v) => v.rule.id}
          loading={rules.loading}
          dataSource={rules.data || []}
          pagination={false}
          scroll={{ x: 820 }}
          columns={[
            { title: 'Rule', key: 'id', render: (_, v) => <><span className="db-code">{v.rule.id}</span><div><Typography.Text type="secondary">{v.rule.description}</Typography.Text></div></> },
            { title: 'Action', key: 'a', render: (_, v) => <Tag>{v.rule.action}</Tag> },
            { title: 'Sheet', key: 's', render: (_, v) => (v.rule.sheet === '*' ? 'Every sheet' : v.rule.sheet) },
            { title: 'Column', key: 'f', render: (_, v) => (v.rule.field === '*' ? 'Every column' : v.rule.field) },
            {
              title: 'On', key: 'on',
              render: (_, v) => (
                <Switch size="small" checked={v.rule.enabled} disabled={!admin} aria-label={`Run ${v.rule.id}`}
                  onChange={(on) => save({ ...v.rule, enabled: on })} />
              ),
            },
            { title: 'Source', key: 'src', render: (_, v) => (v.stored ? <Tag color="blue">{v.shipped ? 'Changed' : 'Added'}</Tag> : <Tag>Shipped</Tag>) },
            {
              title: '', key: 'x', align: 'right',
              render: (_, v) => admin && (
                <Space>
                  <Button size="small" onClick={() => setEditing(JSON.stringify(v.rule, null, 2))}>Edit</Button>
                  {v.stored && (
                    <Popconfirm title={v.shipped ? 'Go back to the shipped rule?' : 'Remove this rule?'}
                      onConfirm={() => deleteCleaningRule(v.rule.id).then(() => rules.reload(), (e) => message.error(e.message))}>
                      <Button size="small">{v.shipped ? 'Reset' : 'Remove'}</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={editing !== null} title="Cleaning rule" okText="Save" onOk={saveEditor} confirmLoading={busy} onCancel={() => setEditing(null)} width={680} destroyOnClose>
        <Typography.Paragraph type="secondary">
          action: TRIM, UPPER, LOWER, PHONE_KE, OPTION_MATCH, PAD_LEFT (length, value), REPLACE (pattern, replacement),
          DEFAULT_VALUE (value), REMOVE_DUPLICATE_ROWS (field *). sheet and field may be * for all.
        </Typography.Paragraph>
        <Input.TextArea aria-label="Definition" className="db-code" rows={14} value={editing || ''} onChange={(e) => setEditing(e.target.value)} />
      </Modal>
    </Space>
  )
}
