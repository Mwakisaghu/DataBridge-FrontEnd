import { Link, useSearchParams } from 'react-router-dom'
import { Card, Cascader, Empty, Select, Space, Typography } from 'antd'
import PageHeader from '../components/PageHeader'
import LoadError from '../components/LoadError'
import ReconciliationPanel from '../components/ReconciliationPanel'
import useLoad from '../hooks/useLoad'
import { getChecks, getOverview } from '../api/databridge'
import { findRun, runOptions } from '../runs'
import { when } from '../format'

/** Module 4: a run's reconciliation, by check (the latest by default). */
export default function Reconciliation() {
  const [params, setParams] = useSearchParams()
  const runId = params.get('run')
  const overviewLoad = useLoad(getOverview)
  const overview = overviewLoad.data || []
  const target = runId ? findRun(overview, runId) : null
  const checks = useLoad(() => (runId ? getChecks(runId) : Promise.resolve([])), [runId])
  const list = checks.data || []
  const checkId = params.get('check') || list[0]?.id

  return (
    <div className="db-page">
      <PageHeader
        title="Reconciliation"
        description="The trial balance must balance and every control account must equal its subledgers. Variances are explained by the consultant and approved by Finance."
      />
      <LoadError error={overviewLoad.error || checks.error} onRetry={() => { overviewLoad.reload(); checks.reload() }} />
      <Card>
        <Space wrap size={24} style={{ width: '100%' }}>
          <div style={{ minWidth: 280, flex: 1 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Run</Typography.Text>
            <Cascader
              aria-label="Run"
              style={{ width: '100%', maxWidth: 640 }}
              options={runOptions(overview)}
              value={target ? [target.client.id, target.project.id, target.run.id] : []}
              placeholder="Choose client, project and run"
              onChange={(path) => setParams(path?.length === 3 ? { run: path[2] } : {})}
              allowClear
              showSearch
            />
          </div>
          {runId && list.length > 0 && (
            <div style={{ minWidth: 240 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Check</Typography.Text>
              <Select
                aria-label="Check"
                style={{ width: 280 }}
                value={checkId}
                onChange={(v) => setParams({ run: runId, check: v })}
                options={list.map((c) => ({ value: c.id, label: `Check ${c.checkNo}, ${when(c.createdAt)}` }))}
              />
            </div>
          )}
        </Space>
      </Card>
      {runId && !checks.loading && list.length === 0 && (
        <Card style={{ marginTop: 24 }}>
          <Empty description={<>No checks yet. <Link to={`/intake?run=${runId}`}>Submit this run&apos;s workbooks</Link> first.</>} />
        </Card>
      )}
      {checkId && <ReconciliationPanel key={checkId} checkId={checkId} />}
    </div>
  )
}
