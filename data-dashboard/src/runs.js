import { day, runLabel } from './format'

/** client > project > run options; closed runs can be viewed but not uploaded to. */
export function runOptions(overview) {
  return overview.map((c) => ({
    value: c.client.id,
    label: c.client.name,
    children: c.projects.map((p) => ({
      value: p.project.id,
      label: p.project.name,
      children: p.runs.map((r) => ({
        value: r.run.id,
        label: `${runLabel(r.run)}, cutoff ${day(r.run.cutoffDate)}${r.run.state === 'CLOSED' ? ' (closed)' : ''}`,
      })),
    })),
  }))
}

export function findRun(overview, runId) {
  for (const c of overview) for (const p of c.projects) for (const r of p.runs) {
    if (r.run.id === runId) return { client: c.client, project: p.project, run: r.run }
  }
  return null
}
