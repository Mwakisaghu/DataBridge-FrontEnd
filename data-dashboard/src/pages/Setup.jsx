import { useEffect, useMemo, useState } from 'react'
import { Alert, App, AutoComplete, Button, Card, Col, Divider, Drawer, Form, Input, InputNumber, Popconfirm, Radio, Row, Select, Space, Switch, Table, Tabs, Tag, Typography, Upload } from 'antd'
import { DeleteOutlined, DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import RulesSetup from './RulesSetup'
import { validated } from '../formValidation'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { deleteTemplateSetup, getSetup, getStoredSetups, getTemplateSetups, importSetups, patchSetup, putTemplateSetup } from '../api/databridge'

const typeSuggestions = ['Code10', 'Code20', 'Code50', 'Text50', 'Text100', 'Text250', 'Decimal', 'Integer', 'Boolean', 'Date', 'DateFormula', 'Option']
  .map((value) => ({ value }))

const norm = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase()

/** DataBridge Setup and Retention Setup. Exported for tests. */
export function GeneralSetup() {
  const { message } = App.useApp()
  const { data, loading, error, reload } = useLoad(getSetup)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const mode = Form.useWatch(['retention', 'mode'], form)

  useEffect(() => {
    if (data) form.setFieldsValue(data)
  }, [data, form])

  const save = async () => {
    const values = await validated(form)
    if (!values) return
    setSaving(true)
    try {
      const saved = await patchSetup(values)
      form.setFieldsValue(saved)
      message.success('Setup saved')
    } catch (e) {
      message.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <LoadError error={error} onRetry={reload} />
      <Form form={form} layout="vertical" requiredMark={false} disabled={loading || !data} style={{ maxWidth: 880 }}>
        <Card title="DataBridge Setup" style={{ marginBottom: 24 }}>
          <Form.Item
            name="workspaceDir"
            label="Workspace folder"
            extra="Where client files are held while they are processed. ${java.io.tmpdir} and ${user.home} are allowed."
            rules={[{ required: true, message: 'Enter a folder' }]}
          >
            <Input className="db-code" />
          </Form.Item>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="maxUploadMb" label="Largest workbook accepted (MB)" rules={[{ required: true }]}>
                <InputNumber min={1} max={2048} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="captionScanRows" label="Rows searched for column captions" rules={[{ required: true }]}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="findingValueMode" label="Client values shown in findings">
            <Select
              options={[
                { value: 'MASKED', label: 'Masked: first and last two characters only (A1********4Q)' },
                { value: 'NONE', label: 'None: no value at all' },
                { value: 'FULL', label: 'Full value: only where cleared to hold client data' },
              ]}
            />
          </Form.Item>
        </Card>

        <Card title="Retention Setup" style={{ marginBottom: 24 }}>
          <Form.Item name={['retention', 'mode']} label="When client files are destroyed">
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="PURGE_ON_COMPLETE">As soon as each upload has been read</Radio>
                <Radio value="KEEP_FOR_HOURS">After a set number of hours, to allow review</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Row gutter={24}>
            {mode === 'KEEP_FOR_HOURS' && (
              <Col xs={24} md={12}>
                <Form.Item name={['retention', 'keepHours']} label="Keep files for (hours)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={720} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={12}>
              <Form.Item
                name={['retention', 'maxRunHours']}
                label="Sweep files left by a crash after (hours)"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={72} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name={['retention', 'secureOverwrite']} label="Overwrite files with zeros before deleting" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name={['retention', 'sweepOnStartup']} label="Sweep expired files when the server starts" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        <Button type="primary" onClick={save} loading={saving}>Save changes</Button>
      </Form>
    </>
  )
}

function SheetEditor({ sheet, onClose, onSaved }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const isNew = !sheet?.sheetName

  useEffect(() => {
    if (sheet) form.setFieldsValue({ ...sheet, fields: sheet.fields || [] })
  }, [sheet, form])

  const save = async () => {
    const v = await validated(form)
    if (!v) return
    setSaving(true)
    try {
      const body = {
        sheetName: v.sheetName.trim(),
        tableName: v.tableName || null,
        tableId: v.tableId ?? null,
        captionRow: v.captionRow ?? null,
        purpose: v.purpose || null,
        fields: (v.fields || []).map((f) => ({ caption: f.caption, type: f.type, options: f.options || [], required: Boolean(f.required) })),
      }
      await putTemplateSetup(body)
      message.success(`Template Setup for ${body.sheetName} saved`)
      onSaved()
    } catch (e) {
      message.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      width={Math.min(760, window.innerWidth)}
      open={Boolean(sheet)}
      onClose={onClose}
      title={isNew ? 'Add Template Setup' : `Template Setup: ${sheet?.sheetName}`}
      extra={<Button type="primary" onClick={save} loading={saving}>Save Template Setup</Button>}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="sheetName" label="Sheet name, as in the workbook" rules={[{ required: true, message: 'Enter the sheet name' }]}>
          <Input disabled={!isNew} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item name="tableName" label="Business Central table"><Input /></Form.Item>
          </Col>
          <Col xs={12} md={10}>
            <Form.Item name="tableId" label="Table ID"><InputNumber min={1} style={{ width: '100%' }} className="db-code" /></Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="captionRow" label="Caption row" extra="Leave empty to find it automatically">
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="purpose" label="What it feeds in BC"><Input placeholder="e.g. Opening balance journal" /></Form.Item>
          </Col>
        </Row>
        <Divider orientation="left" plain>Columns</Divider>
        <Typography.Paragraph type="secondary">
          Columns listed here override the type notes in the template. Captions match regardless of case and spacing.
        </Typography.Paragraph>
        <Form.List name="fields">
          {(fields, { add, remove }) => (
            <>
              {fields.map((f) => (
                <Row key={f.key} gutter={8} align="top">
                  <Col xs={24} md={9}>
                    <Form.Item name={[f.name, 'caption']} rules={[{ required: true, message: 'Caption' }]}>
                      <Input placeholder="Caption" aria-label="Caption" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name={[f.name, 'type']} rules={[{ required: true, message: 'Type' }]}>
                      <AutoComplete options={typeSuggestions} placeholder="Type" aria-label="Type" filterOption />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Item name={[f.name, 'options']}>
                      <Select mode="tags" placeholder="Options" aria-label="Option values" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Item name={[f.name, 'required']} valuePropName="checked">
                      <Switch checkedChildren="Req" unCheckedChildren="Opt" aria-label="Required" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={1}>
                    <Button type="text" icon={<DeleteOutlined />} aria-label="Remove column" onClick={() => remove(f.name)} />
                  </Col>
                </Row>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add({ required: false, options: [] })}>Add column</Button>
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  )
}

function TemplateSetups() {
  const { message } = App.useApp()
  const effective = useLoad(getTemplateSetups)
  const stored = useLoad(getStoredSetups)
  const [editing, setEditing] = useState(null)
  const storedNames = useMemo(() => new Set((stored.data?.templates || []).map((t) => norm(t.sheetName))), [stored.data])

  const reload = () => Promise.all([effective.reload(), stored.reload()])

  const remove = async (name) => {
    try {
      await deleteTemplateSetup(name)
      message.success(`Stored setup for ${name} removed`)
      reload()
    } catch (e) {
      message.error(e.message)
    }
  }

  const exportSetups = () => {
    const blob = new Blob([JSON.stringify(stored.data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `databridge-setups-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importFile = async ({ file, onSuccess, onError }) => {
    try {
      const bundle = JSON.parse(await file.text())
      await importSetups(bundle)
      message.success('Setups imported')
      onSuccess()
      reload()
    } catch (e) {
      message.error(e instanceof SyntaxError ? 'That file is not valid JSON' : e.message)
      onError(e)
    }
  }

  return (
    <>
      <LoadError error={effective.error || stored.error} onRetry={reload} />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Template Setups tell DataBridge which Business Central table a sheet feeds and how to type its columns when the template does not say."
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ fields: [] })}>Add Template Setup</Button>
        <Button icon={<DownloadOutlined />} onClick={exportSetups} disabled={!stored.data}>Export stored setups</Button>
        <Upload accept=".json" showUploadList={false} customRequest={importFile}>
          <Button icon={<UploadOutlined />}>Import setups</Button>
        </Upload>
      </Space>
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey={(s) => s.sheetName}
          loading={effective.loading}
          dataSource={effective.data || []}
          pagination={{ pageSize: 15, hideOnSinglePage: true }}
          scroll={{ x: true }}
          columns={[
            { title: 'Sheet', dataIndex: 'sheetName', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
            { title: 'Business Central table', key: 'table', render: (_, s) => s.tableName || s.purpose || '' },
            { title: 'Table ID', dataIndex: 'tableId', align: 'right', render: (v) => (v ? <span className="db-code">{v}</span> : '') },
            { title: 'Columns', key: 'fields', align: 'right', render: (_, s) => s.fields.length },
            {
              title: 'Source',
              key: 'source',
              render: (_, s) => (storedNames.has(norm(s.sheetName)) ? <Tag color="blue">Stored here</Tag> : <Tag>Shipped default</Tag>),
            },
            {
              title: '',
              key: 'actions',
              align: 'right',
              render: (_, s) => (
                <Space>
                  <Button size="small" onClick={() => setEditing(s)}>Edit</Button>
                  {storedNames.has(norm(s.sheetName)) && (
                    <Popconfirm
                      title={`Remove the stored setup for ${s.sheetName}?`}
                      description="The shipped default applies again, if there is one."
                      okText="Remove"
                      onConfirm={() => remove(s.sheetName)}
                    >
                      <Button size="small" danger>Remove</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <SheetEditor sheet={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />
    </>
  )
}

export default function SetupPage() {
  return (
    <div className="db-page">
      <PageHeader
        title="Setup"
        description="Settings that differ between firms and clients. Every change is checked first and recorded in the audit trail."
      />
      <Tabs
        items={[
          { key: 'general', label: 'DataBridge and retention', children: <GeneralSetup /> },
          { key: 'templates', label: 'Template Setups', children: <TemplateSetups /> },
          { key: 'rules', label: 'Validation rules', children: <RulesSetup /> },
        ]}
      />
    </div>
  )
}
