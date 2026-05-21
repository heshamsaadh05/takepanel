import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const starterCards = [
  {
    to: '/account-functions',
    label: 'Create a New Account',
    badge: 'Primary',
    description: 'Provision a domain, account username, password, and initial hosting settings.'
  },
  {
    to: '/sites',
    label: 'Create a New Website',
    badge: 'Ready',
    description: 'Add a domain, create its document root, and wire it to Apache or Nginx.'
  },
  {
    to: '/backups',
    label: 'Configure Backups',
    badge: 'Important',
    description: 'Schedule website, database, and email backups with restore support.'
  },
  {
    to: '/monitoring',
    label: 'Harden the Server',
    badge: 'Security',
    description: 'Monitor load, apply firewall rules, and enable brute-force protection.'
  }
]

const favorites = [
  { to: '/sites', title: 'Websites', description: 'Domains, virtual hosts, and service control.', tone: 'blue' },
  { to: '/databases', title: 'Databases', description: 'Create databases, users, and grants.', tone: 'indigo' },
  { to: '/email', title: 'Email', description: 'Mailbox management for Postfix and Dovecot.', tone: 'violet' },
  { to: '/dns', title: 'DNS', description: 'Zones, records, and propagation updates.', tone: 'teal' },
  { to: '/ftp', title: 'FTP / SFTP', description: 'User accounts and directory permissions.', tone: 'amber' },
  { to: '/backups', title: 'Backups', description: 'Automated backup jobs and restores.', tone: 'rose' }
]

const toolGroups = [
  {
    title: 'Server Configuration',
    items: [
      { to: '/', title: 'Dashboard', description: 'System overview and shortcuts.' },
      { to: '/monitoring', title: 'Monitoring', description: 'CPU, RAM, disk, and network charts.' }
    ]
  },
  {
    title: 'Account Functions',
    items: [
      { to: '/account-functions', title: 'Account Functions', description: 'Create and manage hosting accounts.' },
      { to: '/sites', title: 'Websites', description: 'Add and remove hosted domains.' },
      { to: '/databases', title: 'Database Services', description: 'MySQL and MariaDB management.' },
      { to: '/email', title: 'Email Accounts', description: 'Create mailboxes and reset passwords.' },
      { to: '/ftp', title: 'Access Accounts', description: 'FTP / SFTP users and permissions.' }
    ]
  },
  {
    title: 'Domains & Recovery',
    items: [
      { to: '/dns', title: 'DNS Functions', description: 'Zones and record maintenance.' },
      { to: '/backups', title: 'Backup', description: 'Schedule and restore backups.' }
    ]
  }
]

function statusTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'active' || normalized === 'ok' || normalized === 'healthy') return 'success'
  if (normalized === 'warning' || normalized === 'medium') return 'warning'
  return 'muted'
}

function Panel({ eyebrow, title, subtitle, children, actions }) {
  return (
    <section className="dashboard-panel">
      <div className="panel-head">
        <div>
          {eyebrow && <p className="panel-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}

function ServiceChip({ name, status }) {
  return (
    <div className={`service-chip ${statusTone(status)}`}>
      <span className="service-dot" />
      <strong>{name}</strong>
      <em>{status}</em>
    </div>
  )
}

function MetricCard({ label, value, max = 100, suffix = '%' }) {
  const numeric = Number(value) || 0
  const width = Math.max(0, Math.min(100, (numeric / max) * 100))

  return (
    <article className="metric-card">
      <div className="metric-head">
        <span>{label}</span>
        <strong>
          {numeric.toFixed(2)}
          {suffix}
        </strong>
      </div>
      <div className="meter">
        <span style={{ width: `${width}%` }} />
      </div>
    </article>
  )
}

function TrendBars({ values, max }) {
  return (
    <div className="sparkline" aria-hidden="true">
      {values.length === 0 ? <span className="spark-empty">No data</span> : null}
      {values.map((value, index) => {
        const height = Math.max(8, Math.min(100, (Number(value) / max) * 100))
        return <i key={`${index}-${value}`} style={{ height: `${height}%` }} />
      })}
    </div>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [summaryRes, metricsRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/monitoring/metrics')
        ])

        if (!alive) return

        const nextMetrics = metricsRes.data?.metrics && typeof metricsRes.data.metrics === 'object'
          ? metricsRes.data.metrics
          : null

        setSummary(summaryRes.data)
        setMetrics(nextMetrics)
        setAlerts(Array.isArray(metricsRes.data?.alerts) ? metricsRes.data.alerts : [])
        if (nextMetrics) {
          setHistory((previous) => [...previous.slice(-8), nextMetrics])
        }
        setUpdatedAt(new Date())
        setError('')
      } catch {
        if (alive) setError('Failed to load dashboard data')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, 15000)

    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const serviceEntries = useMemo(() => Object.entries(summary?.services || {}), [summary])
  const activeServices = serviceEntries.filter(([, status]) => status === 'active').length
  const serviceCount = serviceEntries.length || 7
  const metricsHistory = (history.length > 0 ? history : metrics ? [metrics] : []).filter(Boolean)
  const hostLabel = typeof window !== 'undefined' ? window.location.host : 'localhost'

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <Panel
          eyebrow="Important next steps"
          title="Welcome to TakePanel"
          subtitle="A WHM-style home screen for server owners. The layout can grow module by module as we add more capabilities."
        >
          <div className="step-grid">
            {starterCards.map((item) => (
              <Link key={item.label} to={item.to} className="step-card">
                <span className="step-badge">{item.badge}</span>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                <span className="step-action">Open module →</span>
              </Link>
            ))}
          </div>
        </Panel>

        <aside className="dashboard-side">
          <Panel
            eyebrow="Statistics"
            title="Server Overview"
            subtitle={`Connected to ${hostLabel}`}
            actions={<span className={`status-pill ${activeServices === serviceCount ? 'success' : 'warning'}`}>{activeServices}/{serviceCount} services active</span>}
          >
            <div className="mini-stats">
              <MetricCard label="CPU" value={metrics?.cpu ?? 0} />
              <MetricCard label="RAM" value={metrics?.ram ?? 0} />
              <MetricCard label="Disk" value={metrics?.disk ?? 0} />
              <MetricCard label="Net In" value={metrics?.network?.in_mbps ?? 0} max={1000} suffix=" Mbps" />
              <MetricCard label="Net Out" value={metrics?.network?.out_mbps ?? 0} max={1000} suffix=" Mbps" />
            </div>

            <div className="service-stack">
              {serviceEntries.map(([name, status]) => (
                <ServiceChip key={name} name={name} status={status} />
              ))}
            </div>

            <div className="updated-row">
              <span>Last refresh</span>
              <strong>{updatedAt ? updatedAt.toLocaleTimeString() : 'Waiting...'}</strong>
            </div>
          </Panel>
        </aside>
      </section>

      <Panel eyebrow="Favorites" title="Quick access" subtitle="Frequently used modules are one click away.">
        <div className="favorites-grid">
          {favorites.map((item) => (
            <Link key={item.title} to={item.to} className={`favorite-card tone-${item.tone}`}>
              <div className="favorite-icon">{item.title.slice(0, 2).toUpperCase()}</div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <section className="dashboard-columns">
        <Panel eyebrow="System Health" title="Monitoring snapshot" subtitle="Live resource indicators and alert state.">
          <div className="monitor-grid">
            <MetricCard label="CPU" value={metrics?.cpu ?? 0} />
            <MetricCard label="RAM" value={metrics?.ram ?? 0} />
            <MetricCard label="Disk" value={metrics?.disk ?? 0} />
          </div>
          <div className="trend-grid">
            <article className="trend-card">
              <h3>CPU Trend</h3>
              <TrendBars values={metricsHistory.map((entry) => entry.cpu)} max={100} />
            </article>
            <article className="trend-card">
              <h3>RAM Trend</h3>
              <TrendBars values={metricsHistory.map((entry) => entry.ram)} max={100} />
            </article>
            <article className="trend-card">
              <h3>Disk Trend</h3>
              <TrendBars values={metricsHistory.map((entry) => entry.disk)} max={100} />
            </article>
          </div>
          <div className="alert-stack">
            {alerts.length === 0 ? (
              <div className="empty-note">No active alerts.</div>
            ) : (
              alerts.map((alert, index) => (
                <div key={`${alert.metric}-${index}`} className={`alert-pill ${alert.severity}`}>
                  <strong>{String(alert.metric).toUpperCase()}</strong>
                  <span>threshold reached</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel eyebrow="Tools" title="Server modules" subtitle="The control panel structure is ready for incremental expansion.">
          <div className="tool-groups">
            {toolGroups.map((group) => (
              <section key={group.title} className="tool-group">
                <h3>{group.title}</h3>
                <div className="tool-grid">
                  {group.items.map((item) => (
                    <Link key={item.title} to={item.to} className="tool-card">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Panel>
      </section>

      {error ? <div className="dashboard-error">{error}</div> : null}
      {loading ? <div className="dashboard-loading">Refreshing dashboard…</div> : null}
    </div>
  )
}
