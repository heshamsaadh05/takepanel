import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { formatApiError } from '../utils/apiError'

export default function EmailPage() {
  const [accounts, setAccounts] = useState([])
  const [filterDomain, setFilterDomain] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ domain: '', local_part: '', password: '' })
  const [passwordForm, setPasswordForm] = useState({ accountId: '', password: '' })

  const loadAccounts = async (domain = '') => {
    try {
      const query = domain ? `?domain=${encodeURIComponent(domain)}` : ''
      const res = await api.get(`/emails/accounts${query}`)
      setAccounts(res.data.items || [])
    } catch (err) {
      setError(formatApiError(err, 'Failed to load email accounts'))
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const grouped = useMemo(() => {
    const map = {}
    for (const acc of accounts) {
      if (!map[acc.domain]) map[acc.domain] = []
      map[acc.domain].push(acc)
    }
    return map
  }, [accounts])

  const createAccount = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/emails/accounts', form)
      setForm({ domain: '', local_part: '', password: '' })
      await loadAccounts(filterDomain)
    } catch (err) {
      setError(formatApiError(err, 'Failed to create account'))
    }
  }

  const deleteAccount = async (id) => {
    setError('')
    try {
      await api.delete(`/emails/accounts/${id}`)
      await loadAccounts(filterDomain)
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete account'))
    }
  }

  const toggleStatus = async (id, enabled) => {
    setError('')
    try {
      await api.patch(`/emails/accounts/${id}/status`, { enabled })
      await loadAccounts(filterDomain)
    } catch (err) {
      setError(formatApiError(err, 'Failed to update status'))
    }
  }

  const updatePassword = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.patch(`/emails/accounts/${passwordForm.accountId}/password`, { password: passwordForm.password })
      setPasswordForm({ accountId: '', password: '' })
    } catch (err) {
      setError(formatApiError(err, 'Failed to update password'))
    }
  }

  return (
    <div className="email-wrap">
      <h2>Email Management</h2>
      {error && <p className="error">{error}</p>}

      <section className="email-section">
        <h3>Add Email Account</h3>
        <form className="email-form" onSubmit={createAccount}>
          <input
            type="text"
            placeholder="domain.com"
            value={form.domain}
            pattern="^((?!-)[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}$"
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="local part"
            value={form.local_part}
            pattern="^[a-zA-Z0-9._+-]{1,64}$"
            onChange={(e) => setForm({ ...form, local_part: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="password"
            minLength={10}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="email-section">
        <h3>Filter by Domain</h3>
        <form
          className="email-filter"
          onSubmit={(e) => {
            e.preventDefault()
            loadAccounts(filterDomain)
          }}
        >
          <input
            type="text"
            placeholder="domain.com"
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
          />
          <button type="submit">Apply</button>
          <button type="button" onClick={() => { setFilterDomain(''); loadAccounts('') }}>Clear</button>
        </form>
      </section>

      <section className="email-section">
        <h3>Accounts by Domain</h3>
        {Object.keys(grouped).length === 0 ? (
          <p>No email accounts found.</p>
        ) : (
          Object.entries(grouped).map(([domain, domainAccounts]) => (
            <div key={domain} className="email-domain-group">
              <h4>{domain}</h4>
              <div className="email-list">
                {domainAccounts.map((acc) => (
                  <div key={acc.id} className="email-item">
                    <div>
                      <strong>{acc.email}</strong>
                      <p>Status: {acc.is_enabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div className="email-actions">
                      <button type="button" onClick={() => toggleStatus(acc.id, !acc.is_enabled)}>
                        {acc.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="danger" onClick={() => deleteAccount(acc.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="email-section">
        <h3>Change Password</h3>
        <form className="email-form" onSubmit={updatePassword}>
          <select
            value={passwordForm.accountId}
            onChange={(e) => setPasswordForm({ ...passwordForm, accountId: e.target.value })}
            required
          >
            <option value="">Select account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.email}</option>
            ))}
          </select>
          <input
            type="password"
            placeholder="new password"
            minLength={10}
            value={passwordForm.password}
            onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
            required
          />
          <button type="submit">Update Password</button>
        </form>
      </section>
    </div>
  )
}
