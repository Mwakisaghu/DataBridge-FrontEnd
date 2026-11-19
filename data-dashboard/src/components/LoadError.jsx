import { Alert, Button } from 'antd'

/** Shown when a page's data could not be loaded, with a way to try again. */
export default function LoadError({ error, onRetry }) {
  if (!error) return null
  return (
    <Alert
      type="error"
      showIcon
      style={{ marginBottom: 16 }}
      message={error.message}
      action={onRetry && <Button size="small" onClick={onRetry}>Try again</Button>}
    />
  )
}
