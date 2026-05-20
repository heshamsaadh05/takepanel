import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, disk: 0, network: { in_mbps: 0, out_mbps: 0 } })
  const [alerts, setAlerts] = useState([])
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [sslForm, setSslForm] = useState({ domain: '', email: '' })

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/monitoring/metrics')
      const next = res.data.metrics
      setMetrics(next)
      setAlerts(res.data.alerts || [])
      setHistory((prev) => [...prev.slice(-19), { t: Date.now(), ...next }])
    } catch {
      setError('Failed to fetch monitoring metrics')
    }
  }

  useEffect(() => {
    fetchMetrics()
    const timer = setInterval(fetchMetrics, 10000)
    return () => clearInterval(timer)
  }, [])

  const netMax = useMemo(() => {
    const peak = Math.max(...history.map((h) => Math.max(h.network.in_mbps, h.network.out_mbps)), 1)
    return Math.max(peak, 100)
  }, [history])

  const triggerSecurity = async (action) => {
    setError('')
    setBusyAction(action)
    try {
      if (action === 'firewall') {
        await api.post('/security/firewall/apply')
      } else if (action === 'fail2ban') {
        await api.post('/security/fail2ban/apply')
      }
    } catch (err) {
      setError(err?.response?.data?.error || `Failed to apply ${action}`)
    } finally {
      setBusyAction('')
    }
  }

  const setupSsl = async (e) => {
    e.preventDefault()
    setError('')
    setBusyAction('ssl')
    try {
      await api.post('/security/ssl/setup', sslForm)
      setSslForm({ domain: '', email: '' })
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to configure SSL')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div className="mon-wrap">
      <h2>Monitoring & Security</h2>
      {error && <p className="error">{error}</p>}

      <section className="mon-section">
        <h3>System Metrics</h3>
        <div className="metric-grid">
          <MetricCard label="CPU" value={metrics.cpu} />
          <MetricCard label="RAM" value={metrics.ram} />
          <MetricCard label="Disk" value={metrics.disk} />
          <MetricCard label="Net In Mbps" value={(metrics.network?.in_mbps || 0)} max={netMax} />
          <MetricCard label="Net Out Mbps" value={(metrics.network?.out_mbps || 0)} max={netMax} />
        </div>
        <div className="spark-grid">
          <Sparkline title="CPU Trend" values={history.map((h) => h.cpu)} max={100} />
          <Sparkline title="RAM Trend" values={history.map((h) => h.ram)} max={100} />
          <Sparkline title="Disk Trend" values={history.map((h) => h.disk)} max={100} />
        </div>
      </section>

      <section className="mon-section">
        <h3>Alerts</h3>
        <div className="alert-list">
          {alerts.length === 0 ? <p>No active alerts.</p> : alerts.map((a, i) => (
            <div key={`${a.metric}-${i}`} className={`alert-item ${a.severity}`}>
              <strong>{a.metric.toUpperCase()}</strong> exceeded threshold
            </div>
          ))}
        </div>
      </section>

      <section className="mon-section">
        <h3>Security Actions</h3>
        <div className="sec-actions">
          <button type="button" disabled={busyAction === 'firewall'} onClick={() => triggerSecurity('firewall')}>Apply Firewall (iptables)</button>
          <button type="button" disabled={busyAction === 'fail2ban'} onClick={() => triggerSecurity('fail2ban')}>Apply Fail2Ban</button>
        </div>
        <form className="ssl-form" onSubmit={setupSsl}>
          <input type="text" placeholder="example.com" pattern="^((?!-)[A-Za-z0-9-]{1,63}\\.)+[A-Za-z]{2,63}$" value={sslForm.domain} onChange={(e) => setSslForm({ ...sslForm, domain: e.target.value })} required />
          <input type="email" placeholder="admin@example.com" value={sslForm.email} onChange={(e) => setSslForm({ ...sslForm, email: e.target.value })} required />
          <button type="submit" disabled={busyAction === 'ssl'}>Setup SSL (Let's Encrypt)</button>
        </form>
      </section>
    </div>
  )
}

function MetricCard({ label, value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100))
  return (
    <article className="metric-card">
      <div className="metric-head">
        <span>{label}</span>
        <strong>{Number(value).toFixed(2)}</strong>
      </div>
      <div className="meter"><span style={{ width: `${pct}%` }} /></div>
    </article>
  )
}

function Sparkline({ title, values, max }) {
  return (
    <div className="spark-card">
      <h4>{title}</h4>
      <div className="sparkline">
        {values.length === 0 ? <span className="spark-empty">No data</span> : values.map((v, idx) => {
          const h = Math.max(6, Math.min(100, (v / max) * 100))
          return <i key={idx} style={{ height: `${h}%` }} />
        })}
      </div>
    </div>
  )
}
