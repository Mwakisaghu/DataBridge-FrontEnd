import { useState } from 'react'
import { Alert, App, Button, Card, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { deleteRule, getRules, putRule } from '../api/databridge'
import { describeRule } from '../format'

const typeText = {
  REQUIRED: 'Required', FORMAT: 'Format', UNIQUE: 'Unique', REFERENCE: 'Reference', SUM_EQUALS: 'Group total', COMPARE: 'Comparison',
}

const NEW_RULE = {
  id: 'members.example',
  type: 'FORMAT',
  sheet: 'Members',
  field: 'E-Mail',
  severity: 'WARNING',
  enabled: true,
  autoFixable: false,
  pattern: 'EMAIL',
  description: 'Describe what the rule protects',
}

export default function RulesSetup() {
  const { message } = App.useApp()
  const rules = useLoad(getRules)
  const [editing, setEditing] = useState(null) // { text, isNew }
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')

  const save = async (rule, done) => {
    try {
      await putRule(rule)
      message.success(`Rule ${rule.id} saved`)
      await rules.reload()
      done?.()
    } catch (e) {
      message.error(e.message)
    }
  }

  const saveEditor = async () => {
    let rule
    try {
      rule = JSON.parse(editing.text)
    } catch {
      message.error('That is not valid JSON')
      return
    }
    setBusy(true)
    await save(rule, () => setEditing(null))
    setBusy(false)
  }

  const remove = async (id) => {
    try {
      await deleteRule(id)
      message.success(`Stored rule ${id} removed`)
      rules.reload()
    } catch (e) {
      message.error(e.message)
    }
  }

  const needle = q.trim().toLowerCase()
  const rows = (rules.data || []).filter((v) => !needle
    || [v.rule.id, v.rule.sheet, v.rule.field, v.rule.description].some((x) => (x || '').toLowerCase().includes(needle)))

  return (
    <>
      <LoadError error={rules.error} onRetry={rules.reload} />
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="Rules run on every check, after the type checks that come from each column's Business Central type. A stored rule with the same id as a shipped one replaces it; switch a rule off rather than deleting it." />
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ text: JSON.stringify(NEW_RULE, null, 2), isNew: true })}>Add rule</Button>
        <Input.Search allowClear placeholder="Find a rule, sheet or field" aria-label="Find a rule" style={{ width: 280 }} onChange={(e) => setQ(e.target.value)} />
      </Space>
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey={(v) => v.rule.id}
          loading={rules.loading}
          dataSource={rows}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: true }}
          columns={[
            { title: 'On', key: 'on', width: 70, render: (_, v) => (
              <Switch size="small" checked={v.rule.enabled} aria-label={`Rule ${v.rule.id} on`}
                onChange={(on) => save({ ...v.rule, enabled: on })} />) },
            { title: 'Rule', key: 'id', render: (_, v) => (
              <span><span className="db-code">{v.rule.id}</span><br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{v.rule.description}</Typography.Text></span>) },
            { title: 'Type', key: 'type', render: (_, v) => typeText[v.rule.type] },
            { title: 'Sheet', key: 'sheet', render: (_, v) => v.rule.sheet },
            { title: 'Checks', key: 'what', render: (_, v) => describeRule(v.rule) },
            { title: 'Severity', key: 'sev', width: 140, render: (_, v) => (
              <Select size="small" value={v.rule.severity} style={{ width: 120 }} aria-label={`Severity of ${v.rule.id}`}
                onChange={(sev) => save({ ...v.rule, severity: sev })}
                options={[['CRITICAL', 'Critical'], ['WARNING', 'Warning'], ['INFO', 'Info']].map(([value, label]) => ({ value, label }))} />) },
            { title: 'Source', key: 'src', render: (_, v) => (v.stored ? <Tag color="blue">{v.shipped ? 'Changed here' : 'Added here'}</Tag> : <Tag>Shipped</Tag>) },
            { title: '', key: 'act', align: 'right', render: (_, v) => (
              <Space>
                <Button size="small" onClick={() => setEditing({ text: JSON.stringify(v.rule, null, 2), isNew: false })}>Edit</Button>
                {v.stored && (
                  <Popconfirm title={`Remove the stored rule ${v.rule.id}?`}
                    description={v.shipped ? 'The shipped version applies again.' : 'The rule stops running.'} okText="Remove" onConfirm={() => remove(v.rule.id)}>
                    <Button size="small" danger>{v.shipped ? 'Restore shipped' : 'Remove'}</Button>
                  </Popconfirm>
                )}
              </Space>) },
          ]}
        />
      </Card>
      <Modal open={Boolean(editing)} width={680} title={editing?.isNew ? 'Add rule' : 'Edit rule'} okText="Save rule"
        onOk={saveEditor} confirmLoading={busy} onCancel={() => setEditing(null)} destroyOnClose>
        <Typography.Paragraph type="secondary">
          Types: REQUIRED, FORMAT (pattern: KRA_PIN, KE_PHONE, EMAIL, KE_ID or a regular expression), UNIQUE, REFERENCE
          (targetSheet, targetField), SUM_EQUALS (groupBy, expected, optional whereField and whereEquals), COMPARE (operator LT, LE,
          EQ, GE or GT, otherField). The server checks the rule before saving.
        </Typography.Paragraph>
        <Input.TextArea aria-label="Rule definition" className="db-code" rows={16} value={editing?.text}
          onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
      </Modal>
    </>
  )
}
