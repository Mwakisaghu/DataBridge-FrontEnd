import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, App, Button, Form, Input, Space } from 'antd'
import { changePassword, logout } from '../api/databridge'
import { signedIn, signedOut } from '../redux/sessionSlice'
import AuthLayout from './AuthLayout'

const MIN = 12

/**
 * Change your own password. {@code forced}: shown instead of the app while a temporary
 * password is in use; otherwise opened from the user menu and closed with {@code onDone}.
 */
export default function ChangePassword({ forced = false, onDone }) {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.session.user)
  const { message } = App.useApp()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async ({ currentPassword, newPassword }) => {
    setBusy(true)
    setError(null)
    try {
      const r = await changePassword(currentPassword, newPassword)
      message.success('Password changed')
      dispatch(signedIn(r))
      onDone?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const form = (
    <>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
      <Form layout="vertical" onFinish={submit} requiredMark={false}>
        <input type="text" name="username" autoComplete="username" value={user?.username || ''} readOnly hidden />
        <Form.Item label="Current password" name="currentPassword" rules={[{ required: true, message: 'Enter your current password' }]}>
          <Input.Password autoComplete="current-password" autoFocus />
        </Form.Item>
        <Form.Item
          label="New password"
          name="newPassword"
          extra={`At least ${MIN} characters, with letters and a digit or symbol.`}
          rules={[
            { required: true, message: 'Choose a new password' },
            { min: MIN, message: `Use at least ${MIN} characters` },
            { pattern: /^(?=.*\p{L})(?=.*[^\p{L}]).+$/u, message: 'Use letters and at least one digit or symbol' },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="New password again"
          name="confirm"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Type the new password again' },
            ({ getFieldValue }) => ({
              validator: (_, v) => (!v || v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('The two passwords differ'))),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          {forced ? (
            <Button onClick={() => logout().finally(() => dispatch(signedOut()))}>Sign out</Button>
          ) : (
            <Button onClick={onDone}>Cancel</Button>
          )}
          <Button type="primary" htmlType="submit" loading={busy}>Change password</Button>
        </Space>
      </Form>
    </>
  )

  if (!forced) return form
  return (
    <AuthLayout title="Choose your password" subtitle={`Welcome, ${user?.displayName}. You signed in with a temporary password; choose your own to continue.`}>
      {form}
    </AuthLayout>
  )
}
