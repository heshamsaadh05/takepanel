import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { formatApiError } from '../utils/apiError'

export default function DNSPage() {
  const [zones, setZones] = useState([])
  const [records, setRecords] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [error, setError] = useState('')

  const [zoneForm, setZoneForm] = useState({ domain: '', provider: 'bind' })
  const [recordForm, setRecordForm] = useState({
    zone_id: '',
    name: '@',
    record_type: 'A',
    value: '',
    ttl: 3600,
    priority: ''
  })

  const [editRecordId, setEditRecordId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', value: '', ttl: 3600, priority: '' })

  const loadZones = async () => {
    const res = await api.get('/dns/zones')
    setZones(res.data.items || [])
  }

  const loadRecords = async (zoneId = '') => {
    const q = zoneId ? `?zone_id=${zoneId}` : ''
    const res = await api.get(`/dns/records${q}`)
    setRecords(res.data.items || [])
  }

  const refreshAll = async (zoneId = selectedZoneId) => {
    try {
      await Promise.all([loadZones(), loadRecords(zoneId)])
    } catch (err) {
      setError(formatApiError(err, 'Failed to load DNS data'))
    }
  }

  useEffect(() => {
    refreshAll('')
  }, [])

  const selectedZone = useMemo(() => zones.find((z) => String(z.id) === String(selectedZoneId)), [zones, selectedZoneId])

  const createZone = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/dns/zones', zoneForm)
      setZoneForm({ domain: '', provider: zoneForm.provider })
      await refreshAll(selectedZoneId)
    } catch (err) {
      setError(formatApiError(err, 'Failed to create DNS zone'))
    }
  }

  const removeZone = async (id) => {
    setError('')
    try {
      await api.delete(`/dns/zones/${id}`)
      if (String(selectedZoneId) === String(id)) setSelectedZoneId('')
      await refreshAll('')
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete DNS zone'))
    }
  }

  const createRecord = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/dns/records', {
        ...recordForm,
        zone_id: Number(recordForm.zone_id),
        ttl: Number(recordForm.ttl),
        priority: recordForm.record_type === 'MX' ? Number(recordForm.priority) : null
      })
      setRecordForm({ ...recordForm, value: '', priority: '' })
      await refreshAll(selectedZoneId)
    } catch (err) {
      setError(formatApiError(err, 'Failed to create DNS record'))
    }
  }

  const startEdit = (record) => {
    setEditRecordId(record.id)
    setEditForm({
      name: record.name,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority ?? ''
    })
  }

  const updateRecord = async (record) => {
    setError('')
    try {
      await api.patch(`/dns/records/${record.id}`, {
        name: editForm.name,
        value: editForm.value,
        ttl: Number(editForm.ttl),
        priority: record.record_type === 'MX' ? Number(editForm.priority) : null
      })
      setEditRecordId(null)
      await refreshAll(selectedZoneId)
    } catch (err) {
      setError(formatApiError(err, 'Failed to update DNS record'))
    }
  }

  const deleteRecord = async (id) => {
    setError('')
    try {
      await api.delete(`/dns/records/${id}`)
      await refreshAll(selectedZoneId)
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete DNS record'))
    }
  }

  return (
    <div className="dns-wrap">
      <h2>DNS Management</h2>
      {error && <p className="error">{error}</p>}

      <section className="dns-section">
        <h3>Add Zone</h3>
        <form className="dns-form" onSubmit={createZone}>
          <input
            type="text"
            placeholder="example.com"
            pattern="^((?!-)[A-Za-z0-9-]{1,63}\\.)+[A-Za-z]{2,63}$"
            value={zoneForm.domain}
            onChange={(e) => setZoneForm({ ...zoneForm, domain: e.target.value })}
            required
          />
          <select value={zoneForm.provider} onChange={(e) => setZoneForm({ ...zoneForm, provider: e.target.value })}>
            <option value="bind">BIND</option>
            <option value="powerdns">PowerDNS</option>
          </select>
          <button type="submit">Create Zone</button>
        </form>

        <div className="dns-list">
          {zones.map((zone) => (
            <div key={zone.id} className="dns-item">
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  setSelectedZoneId(String(zone.id))
                  loadRecords(zone.id).catch((err) => setError(formatApiError(err, 'Failed to load DNS records')))
                }}
              >
                {zone.domain} ({zone.provider})
              </button>
              <button type="button" className="danger" onClick={() => removeZone(zone.id)}>Delete</button>
            </div>
          ))}
        </div>
      </section>

      <section className="dns-section">
        <h3>Add Record {selectedZone ? `for ${selectedZone.domain}` : ''}</h3>
        <form className="dns-form-wide" onSubmit={createRecord}>
          <select
            value={recordForm.zone_id}
            onChange={(e) => {
              const zoneId = e.target.value
              setRecordForm({ ...recordForm, zone_id: zoneId })
              setSelectedZoneId(zoneId)
              loadRecords(zoneId).catch((err) => setError(formatApiError(err, 'Failed to load DNS records')))
            }}
            required
          >
            <option value="">Select zone</option>
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.domain}</option>)}
          </select>
          <input type="text" placeholder="Name (@, www, mail)" value={recordForm.name} onChange={(e) => setRecordForm({ ...recordForm, name: e.target.value })} required />
          <select value={recordForm.record_type} onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}>
            <option value="A">A</option>
            <option value="CNAME">CNAME</option>
            <option value="MX">MX</option>
            <option value="TXT">TXT</option>
          </select>
          <input type="text" placeholder="Record value" value={recordForm.value} onChange={(e) => setRecordForm({ ...recordForm, value: e.target.value })} required />
          <input type="number" min="60" max="86400" value={recordForm.ttl} onChange={(e) => setRecordForm({ ...recordForm, ttl: e.target.value })} required />
          {recordForm.record_type === 'MX' ? (
            <input type="number" min="0" max="65535" placeholder="Priority" value={recordForm.priority} onChange={(e) => setRecordForm({ ...recordForm, priority: e.target.value })} required />
          ) : <span />}
          <button type="submit">Add Record</button>
        </form>

        <div className="dns-list">
          {records.map((rec) => (
            <div key={rec.id} className="dns-record-item">
              {editRecordId === rec.id ? (
                <>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <input value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} />
                  <input type="number" min="60" max="86400" value={editForm.ttl} onChange={(e) => setEditForm({ ...editForm, ttl: e.target.value })} />
                  {rec.record_type === 'MX' && (
                    <input type="number" min="0" max="65535" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} />
                  )}
                  <button type="button" onClick={() => updateRecord(rec)}>Save</button>
                  <button type="button" onClick={() => setEditRecordId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span>{rec.name} {rec.record_type} {rec.value} TTL:{rec.ttl}{rec.priority !== null ? ` Pri:${rec.priority}` : ''}</span>
                  <div className="dns-actions">
                    <button type="button" onClick={() => startEdit(rec)}>Edit</button>
                    <button type="button" className="danger" onClick={() => deleteRecord(rec.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
