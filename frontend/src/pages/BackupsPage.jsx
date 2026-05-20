import { useEffect, useState } from 'react'
import api from '../api/client'

export default function BackupsPage() {
  const [backups, setBackups] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [scheduleForm, setScheduleForm] = useState({ cron_expression: '0 2 * * *', is_enabled: true })
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const loadBackups = async () => {
    const res = await api.get('/backups')
    setBackups(res.data.items || [])
  }

  const loadSchedule = async () => {
    const res = await api.get('/backups/schedule')
    setSchedule(res.data.item)
    if (res.data.item) {
      setScheduleForm({
        cron_expression: res.data.item.cron_expression,
        is_enabled: res.data.item.is_enabled,
      })
    }
  }

  const refresh = async () => {
    try {
      await Promise.all([loadBackups(), loadSchedule()])
    } catch {
      setError('Failed to load backup dashboard data')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const runBackup = async () => {
    setError('')
    setRunning(true)
    try {
      await api.post('/backups/run', { backup_type: 'full' })
      await loadBackups()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to run backup')
    } finally {
      setRunning(false)
    }
  }

  const restoreBackup = async (backupId) => {
    setError('')
    try {
      await api.post('/backups/restore', { backup_id: backupId })
      alert('Restore completed')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to restore backup')
    }
  }

  const saveSchedule = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/backups/schedule', scheduleForm)
      await loadSchedule()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save backup schedule')
    }
  }

  return (
    <div className="backup-wrap">
      <h2>Automated Backups</h2>
      {error && <p className="error">{error}</p>}

      <section className="backup-section">
        <h3>Run Backup</h3>
        <button className="backup-run-btn" disabled={running} onClick={runBackup}>Run Full Backup</button>
      </section>

      <section className="backup-section">
        <h3>Backup Schedule (Cron)</h3>
        <form className="backup-form" onSubmit={saveSchedule}>
          <input
            type="text"
            placeholder="0 2 * * *"
            value={scheduleForm.cron_expression}
            onChange={(e) => setScheduleForm({ ...scheduleForm, cron_expression: e.target.value })}
            required
          />
          <label className="backup-checkbox">
            <input
              type="checkbox"
              checked={scheduleForm.is_enabled}
              onChange={(e) => setScheduleForm({ ...scheduleForm, is_enabled: e.target.checked })}
            />
            Enabled
          </label>
          <button type="submit">Save Schedule</button>
        </form>
        {schedule && <p>Current: <strong>{schedule.cron_expression}</strong></p>}
      </section>

      <section className="backup-section">
        <h3>Available Backups</h3>
        <div className="backup-list">
          {backups.map((b) => (
            <div key={b.id} className="backup-item">
              <div>
                <strong>{b.backup_name}</strong>
                <p>{b.backup_type} | {b.status} | {b.size_bytes} bytes</p>
              </div>
              <button type="button" onClick={() => restoreBackup(b.id)}>Restore</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
