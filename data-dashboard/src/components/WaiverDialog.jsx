import { useState } from 'react'
import { App, Form, Input, Modal, Typography } from 'antd'
import { decideWaiver, requestWaiver } from '../api/databridge'

const words = {
  waiver: {
    request: 'Request a waiver', approve: 'Approve the waiver', reject: 'Reject the waiver',
    requested: 'Waiver requested', approved: 'Waiver approved', rejected: 'Waiver rejected',
    why: 'Why this can be accepted as it is', by: 'Requested by',
  },
  variance: {
    request: 'Explain the variance', approve: 'Approve the explanation', reject: 'Reject the explanation',
    requested: 'Explanation sent to Finance', approved: 'Explanation approved', rejected: 'Explanation rejected',
    why: 'What causes the variance and how it will be cleared', by: 'Explained by',
  },
}

/** Request, approve or reject a waiver; for reconciliation variances, explain and approve. */
export default function WaiverDialog({ dialog, onClose, onDone, wording = 'waiver' }) {
  const w = words[wording]
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  if (!dialog) return null
  const { finding, mode } = dialog
  const submit = async () => {
    let values
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setBusy(true)
    try {
      if (mode === 'request') await requestWaiver(finding.id, values.text)
      else await decideWaiver(finding.id, mode === 'approve', values.text)
      message.success(mode === 'request' ? w.requested : mode === 'approve' ? w.approved : w.rejected)
      form.resetFields()
      onDone()
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  const title = w[mode]
  return (
    <Modal open title={title} okText={title} onOk={submit} confirmLoading={busy} onCancel={onClose} destroyOnClose
      okButtonProps={{ danger: mode === 'reject' }}>
      <Typography.Paragraph>
        {finding.sheet} row {finding.rowNo}, {finding.field}: {finding.message}
      </Typography.Paragraph>
      {mode !== 'request' && (
        <Typography.Paragraph type="secondary">{w.by} {finding.requestedBy}: {finding.waiverReason}</Typography.Paragraph>
      )}
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="text"
          label={mode === 'request' ? w.why : mode === 'approve' ? 'Note (optional)' : 'Why the waiver is rejected'}
          rules={mode === 'approve' ? [] : [{ required: true, min: mode === 'request' ? 10 : 1, message: mode === 'request' ? 'At least 10 characters' : 'Give a reason' }]}
        >
          <Input.TextArea rows={3} maxLength={500} showCount />
        </Form.Item>
      </Form>
      {mode === 'request' && (
        <Typography.Text type="secondary">{wording === 'variance' ? 'Finance approves it; never the person who explained it.' : 'A different person must approve it. That is the maker-checker rule.'}</Typography.Text>
      )}
    </Modal>
  )
}
