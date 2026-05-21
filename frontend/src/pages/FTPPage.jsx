import { useEffect, useState } from 'react'
import api from '../api/client'
import { formatApiError } from '../utils/apiError'

export default function FTPPage() {
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    username: '',
    password: '',
    protocol: 'vsftpd',
    home_directory: '/var/www',
    permissions: 'rw'
  })
  const [edit, setEdit] = useState({ id: '', home_directory: '', permissions: 'rw' })

  const loadAccounts = async () => {
    try {
      const res = await api.get('/ftp/accounts')
      setAccounts(res.data.items || [])
    } catch (err) {
      setError(formatApiError(err, 'Failed to load FTP accounts'))
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const createAccount = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/ftp/accounts', form)
      setForm({ ...form, username: '', password: '' })
      await loadAccounts()
    } catch (err) {
      setError(formatApiError(err, 'Failed to create FTP account'))
    }
  }

  const updateAccount = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.patch(`/ftp/accounts/${edit.id}`, {
        home_directory: edit.home_directory,
        permissions: edit.permissions
      })
      setEdit({ id: '', home_directory: '', permissions: 'rw' })
      await loadAccounts()
    } catch (err) {
      setError(formatApiError(err, 'Failed to update FTP account'))
    }
  }

  const deleteAccount = async (id) => {
    setError('')
    try {
      await api.delete(`/ftp/accounts/${id}`)
      await loadAccounts()
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete FTP account'))
    }
  }

  return (
    <div className="ftp-wrap">
      <h2>FTP / SFTP Management</h2>
      {error && <p className="error">{error}</p>}

      <section className="ftp-section">
        <h3>Add Account</h3>
        <form className="ftp-form" onSubmit={createAccount}>
          <input
            type="text"
            placeholder="username"
            pattern="^[a-z_][a-z0-9_-]{2,31}$"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            type="password"
            minLength={10}
            placeholder="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
            <option value="vsftpd">vsftpd</option>
            <option value="proftpd">proftpd</option>
            <option value="openssh-sftp">OpenSSH SFTP</option>
          </select>
          <input
            type="text"
            placeholder="/home/ftpuser"
            value={form.home_directory}
            onChange={(e) => setForm({ ...form, home_directory: e.target.value })}
            required
          />
          <select value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })}>
            <option value="rw">Read / Write</option>
            <option value="r">Read Only</option>
          </select>
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="ftp-section">
        <h3>Accounts</h3>
        <div className="ftp-list">
          {accounts.map((acc) => (
            <div key={acc.id} className="ftp-item">
              <div>
                <strong>{acc.username}</strong>
                <p>{acc.protocol} | {acc.home_directory} | {acc.permissions}</p>
              </div>
              <div className="ftp-actions">
                <button
                  type="button"
                  onClick={() => setEdit({ id: acc.id, home_directory: acc.home_directory, permissions: acc.permissions })}
                >Edit</button>
                <button type="button" className="danger" onClick={() => deleteAccount(acc.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ftp-section">
        <h3>Update Directory / Permission</h3>
        <form className="ftp-edit-form" onSubmit={updateAccount}>
          <select value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} required>
            <option value="">Select account</option>
            {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.username}</option>)}
          </select>
          <input
            type="text"
            placeholder="/home/ftpuser"
            value={edit.home_directory}
            onChange={(e) => setEdit({ ...edit, home_directory: e.target.value })}
            required
          />
          <select value={edit.permissions} onChange={(e) => setEdit({ ...edit, permissions: e.target.value })}>
            <option value="rw">Read / Write</option>
            <option value="r">Read Only</option>
          </select>
          <button type="submit">Update</button>
        </form>
      </section>
    </div>
  )
}
