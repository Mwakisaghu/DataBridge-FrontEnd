import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Spin } from 'antd'
import { me } from '../api/databridge'
import { signedIn, signedOut } from '../redux/sessionSlice'
import SignIn from '../pages/SignIn'
import ChangePassword from '../pages/ChangePassword'

/**
 * Asks the server who is using the UI before showing anything else. Shows the sign-in screen
 * when nobody is, and the change-password screen while a temporary password is in use.
 */
export default function AuthGate({ children }) {
  const { status, user } = useSelector((s) => s.session)
  const dispatch = useDispatch()

  useEffect(() => {
    if (status !== 'checking') return
    me().then(
      (r) => dispatch(signedIn(r)),
      () => dispatch(signedOut()),
    )
  }, [status, dispatch])

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" aria-label="Loading" />
      </div>
    )
  }
  if (status === 'signedOut') return <SignIn />
  if (user?.mustChangePassword) return <ChangePassword forced />
  return children
}
