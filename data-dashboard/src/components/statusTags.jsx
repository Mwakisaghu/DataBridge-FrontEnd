import { Tag } from 'antd'

/** How a check's result is shown everywhere. */
export const statusTag = {
  SUCCEEDED: <Tag color="green">Passed</Tag>,
  FAILED: <Tag color="red">Critical findings</Tag>,
  ERROR: <Tag color="volcano">Could not complete</Tag>,
}

