import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Alert, Button, Form, Input } from 'antd'
import { login } from '../api/databridge'
import { signedIn } from '../redux/sessionSlice'
import AuthLayout from './AuthLayout'

export default function SignIn() {
  const dispatch = useDispatch()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async ({ username, password }) => {
    setBusy(true)
    setError(null)
    try {
      dispatch(signedIn(await login(username, password)))
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Use the DataBridge account your administrator gave you.">
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
      <Form layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item label="User name" name="username" rules={[{ required: true, message: 'Enter your user name' }]}>
          <Input autoComplete="username" autoFocus />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter your password' }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={busy}>Sign in</Button>
      </Form>
    </AuthLayout>
  )
}
