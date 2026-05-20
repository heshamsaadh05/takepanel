import { useEffect, useState } from 'react'
import api from '../api/client'

export default function SitesPage() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ domain: '', server_type: 'nginx' })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [serviceBusy, setServiceBusy] = useState('')

  const loadSites = async () => {
    setLoading(true)
    try {
      const res = await api.get('/web/sites')
      setSites(res.data.items || [])
    } catch {
      setError('Failed to load websites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSites()
  }, [])

  const onAdd = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await api.post('/web/sites', form)
      setForm({ domain: '', server_type: form.server_type })
      await loadSites()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add website')
    }
  }

  const serviceAction = async (action) => {
    setServiceBusy(action)
    setError('')
    try {
      await api.post(`/web/service/${action}`)
    } catch (err) {
      setError(err?.response?.data?.error || `Failed to ${action} web service`)
    } finally {
      setServiceBusy('')
    }
  }

  const actOnSite = async (siteId, action) => {
    setBusyId(siteId)
    setError('')
    try {
      if (action === 'remove') {
        await api.delete(`/web/sites/${siteId}`)
      } else {
        await api.post(`/web/sites/${siteId}/${action}`)
      }
      await loadSites()
    } catch (err) {
      setError(err?.response?.data?.error || `Failed to ${action} website`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="sites-wrap">
      <h2>Websites</h2>

      <form className="site-form" onSubmit={onAdd}>
        <input
          type="text"
          placeholder="example.com"
          pattern="^((?!-)[A-Za-z0-9-]{1,63}\\.)+[A-Za-z]{2,63}$"
          value={form.domain}
          onChange={(e) => setForm({ ...form, domain: e.target.value })}
          required
        />
        <select
          value={form.server_type}
          onChange={(e) => setForm({ ...form, server_type: e.target.value })}
        >
          <option value="nginx">Nginx</option>
          <option value="apache">Apache</option>
        </select>
        <button type="submit">Add Website</button>
      </form>
      <div className="service-actions">
        <button type="button" disabled={serviceBusy === 'start'} onClick={() => serviceAction('start')}>Start Web Service</button>
        <button type="button" disabled={serviceBusy === 'stop'} onClick={() => serviceAction('stop')}>Stop Web Service</button>
        <button type="button" disabled={serviceBusy === 'restart'} onClick={() => serviceAction('restart')}>Restart Web Service</button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading websites...</p>
      ) : (
        <div className="sites-grid">
          {sites.map((site) => (
            <article key={site.id} className="site-card">
              <h3>{site.domain}</h3>
              <p><strong>Root:</strong> {site.web_root}</p>
              <p><strong>Server:</strong> {site.server_type}</p>
              <p><strong>Status:</strong> {site.status}</p>
              <div className="site-actions">
                <button type="button" disabled={busyId === site.id} onClick={() => actOnSite(site.id, 'start')}>Start</button>
                <button type="button" disabled={busyId === site.id} onClick={() => actOnSite(site.id, 'stop')}>Stop</button>
                <button type="button" className="danger" disabled={busyId === site.id} onClick={() => actOnSite(site.id, 'remove')}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
