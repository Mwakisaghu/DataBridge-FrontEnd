import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Alert, App, Button, Card, Col, Form, Input, InputNumber, Row, Space, Switch, Tag, Typography } from 'antd'
import LoadError from '../components/LoadError'
import useLoad from '../hooks/useLoad'
import { getIntegrationSetup, putIntegrationSetup, testIntegration } from '../api/databridge'
import { hasRole } from '../redux/sessionSlice'

/** Setup tab: how DataBridge reaches the client's Business Central, and the package gate. */
export default function IntegrationSetup() {
  const { message } = App.useApp()
  const load = useLoad(getIntegrationSetup)
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const user = useSelector((s) => s.session.user)
  const local = useSelector((s) => s.session.authMode === 'local')
  const admin = !local || hasRole(user, 'ADMIN')

  useEffect(() => {
    if (load.data) form.setFieldsValue({ ...load.data.setup, entitiesText: JSON.stringify(load.data.setup.entities, null, 2) })
  }, [load.data, form])

  const save = async (v) => {
    let entities
    try {
      entities = JSON.parse(v.entitiesText || '[]')
    } catch {
      message.error('Entity maps are not valid JSON')
      return
    }
    const { entitiesText: _ignored, ...rest } = v
    setBusy(true)
    try {
      await putIntegrationSetup({ ...load.data.setup, ...rest, entities })
      message.success('Integration Setup saved')
      load.reload()
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setTesting(true)
    try {
      setResult(await testIntegration())
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }

  if (load.error) return <LoadError error={load.error} onRetry={load.reload} />
  const secretEnv = load.data?.setup.clientSecretEnv
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="DataBridge only reads from Business Central (it counts records after an import) and never stores the client secret."
        description={<>Register an app in Microsoft Entra ID, add it in Business Central with read permissions, and put its secret in the server's environment variable <Typography.Text code>{secretEnv || 'DATABRIDGE_BC_CLIENT_SECRET'}</Typography.Text>.</>}
      />
      <Card title="Business Central" loading={load.loading}
        extra={load.data && (load.data.secretPresent ? <Tag color="green">Secret set on the server</Tag> : <Tag color="gold">Secret not set</Tag>)}>
        <Form form={form} layout="vertical" onFinish={save} disabled={!admin}>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Tenant ID" name="tenantId"><Input placeholder="contoso.onmicrosoft.com or GUID" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Environment" name="environment"><Input placeholder="Production" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Company ID" name="companyId"><Input placeholder="GUID from /companies" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Client (application) ID" name="clientId"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Secret environment variable" name="clientSecretEnv"><Input className="db-code" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Timeout (seconds)" name="timeoutSeconds"><InputNumber min={1} max={300} /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Token URL" name="tokenUrl"><Input className="db-code" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="API base URL" name="apiBaseUrl"><Input className="db-code" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Scope" name="scope"><Input className="db-code" /></Form.Item></Col>
            <Col xs={24}>
              <Form.Item label="Require a clean check before building a package" name="requireCleanCheck" valuePropName="checked"
                extra="On: a package is built only from the exact file validated in the latest check, with no open Critical finding in it.">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Entity maps (sheet → API entity set, for counting after import)" name="entitiesText">
                <Input.TextArea aria-label="Entity maps" rows={10} className="db-code" />
              </Form.Item>
            </Col>
          </Row>
          {admin && (
            <Space>
              <Button type="primary" htmlType="submit" loading={busy}>Save</Button>
              <Button onClick={test} loading={testing} disabled={false}>Test connection</Button>
            </Space>
          )}
        </Form>
        {result && (
          <Alert style={{ marginTop: 16 }} type={result.ok ? 'success' : 'error'} showIcon message={result.message}
            description={result.companies?.length ? result.companies.map((c) => `${c.displayName} (${c.id})`).join(', ') : null} />
        )}
      </Card>
    </Space>
  )
}
