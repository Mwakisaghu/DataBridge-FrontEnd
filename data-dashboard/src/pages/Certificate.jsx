import { Link, useSearchParams } from 'react-router-dom'
import { Button, Result, Space, Spin } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import useLoad from '../hooks/useLoad'
import { getRunSummary } from '../api/databridge'
import { colors } from '../theme'

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'short' }) : '')

/** The migration certificate of a signed-off run, laid out to print (or save as PDF from the browser). */
export default function Certificate() {
  const [params] = useSearchParams()
  const runId = params.get('run')
  const summary = useLoad(() => getRunSummary(runId), [runId])
  const s = summary.data
  if (summary.loading) return <Spin style={{ margin: 48 }} />
  if (!s || s.signOff?.status !== 'APPROVED') {
    return <Result status="info" title="No certificate yet" subTitle="A certificate is issued when Finance approves the run's sign-off."
      extra={<Link to={`/reports?run=${runId}`}><Button>Back to reports</Button></Link>} />
  }
  const so = s.signOff
  return (
    <div className="db-page">
      <Space className="db-no-print" style={{ marginBottom: 16 }}>
        <Link to={`/reports?run=${runId}`}><Button>Back to reports</Button></Link>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>Print or save as PDF</Button>
      </Space>
      <article className="db-certificate" style={{ maxWidth: 820, margin: '0 auto', background: '#fff', padding: '56px 64px', border: `2px solid ${colors.teal}` }}>
        <p style={{ letterSpacing: 2, textTransform: 'uppercase', color: colors.teal, fontWeight: 600, margin: 0 }}>DataBridge</p>
        <h1 style={{ fontSize: 30, margin: '8px 0 4px' }}>Data migration certificate</h1>
        <p style={{ color: '#5A6B78', marginTop: 0 }} className="db-code">{so.certificateNo}</p>
        <p style={{ fontSize: 16, lineHeight: 1.6, marginTop: 32 }}>
          The {s.run.type === 'CUTOVER' ? 'cutover' : 'mock'} migration run {s.run.runNo} of <strong>{s.client.name}</strong> ({s.project.name}),
          with cutoff date <strong>{new Date(s.run.cutoffDate).toLocaleDateString('en-KE', { dateStyle: 'long' })}</strong>, met every readiness
          condition below and was signed off.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
          <tbody>
            {s.checklist.map((i) => (
              <tr key={i.id} style={{ borderTop: '1px solid #E5E9EC' }}>
                <td style={{ padding: '10px 8px', width: 28, color: '#1B6E43' }}>✓</td>
                <td style={{ padding: '10px 8px', fontWeight: 600 }}>{i.label}</td>
                <td style={{ padding: '10px 8px', color: '#5A6B78' }}>{i.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 48, marginTop: 48, flexWrap: 'wrap' }}>
          <div><div style={{ color: '#5A6B78', fontSize: 13 }}>Requested by</div><div style={{ fontWeight: 600 }}>{so.requestedBy}</div><div>{fmt(so.requestedAt)}</div></div>
          <div><div style={{ color: '#5A6B78', fontSize: 13 }}>Approved by (Finance)</div><div style={{ fontWeight: 600 }}>{so.decidedBy}</div><div>{fmt(so.decidedAt)}</div></div>
        </div>
        {so.decisionNote && <p style={{ marginTop: 24, color: '#5A6B78' }}>Note: {so.decisionNote}</p>}
        <p style={{ marginTop: 48, fontSize: 12, color: '#8A98A3' }}>
          DataBridge keeps no client records: this certificate rests on fingerprints, counts and the approvals in its audit trail.
        </p>
      </article>
    </div>
  )
}
