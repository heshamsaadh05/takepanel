import { useEffect, useState } from 'react'
import api from '../api/client'

export default function DatabasesPage() {
  const [databases, setDatabases] = useState([])
  const [dbUsers, setDbUsers] = useState([])
  const [grants, setGrants] = useState([])
  const [error, setError] = useState('')

  const [dbForm, setDbForm] = useState({ name: '', engine: 'mysql' })
  const [userForm, setUserForm] = useState({ username: '', password: '', host: '%' })
  const [grantForm, setGrantForm] = useState({ database_id: '', db_user_id: '', privileges: 'ALL PRIVILEGES' })

  const loadAll = async () => {
    try {
      const [dbRes, usersRes, grantsRes] = await Promise.all([
        api.get('/databases'),
        api.get('/databases/users'),
        api.get('/databases/grants')
      ])
      setDatabases(dbRes.data.items || [])
      setDbUsers(usersRes.data.items || [])
      setGrants(grantsRes.data.items || [])
    } catch {
      setError('Failed to load database module data')
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const createDatabase = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/databases', dbForm)
      setDbForm({ ...dbForm, name: '' })
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create database')
    }
  }

  const deleteDatabase = async (id) => {
    setError('')
    try {
      await api.delete(`/databases/${id}`)
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to delete database')
    }
  }

  const createUser = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/databases/users', userForm)
      setUserForm({ username: '', password: '', host: '%' })
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create database user')
    }
  }

  const deleteUser = async (id) => {
    setError('')
    try {
      await api.delete(`/databases/users/${id}`)
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to delete database user')
    }
  }

  const grantPrivileges = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/databases/grants', {
        database_id: Number(grantForm.database_id),
        db_user_id: Number(grantForm.db_user_id),
        privileges: grantForm.privileges
      })
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to grant privileges')
    }
  }

  return (
    <div className="db-wrap">
      <h2>Database Management</h2>
      {error && <p className="error">{error}</p>}

      <section className="db-section">
        <h3>Create Database</h3>
        <form className="db-form" onSubmit={createDatabase}>
          <input
            type="text"
            placeholder="database_name"
            pattern="^[a-zA-Z0-9_]{1,64}$"
            value={dbForm.name}
            onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })}
            required
          />
          <select value={dbForm.engine} onChange={(e) => setDbForm({ ...dbForm, engine: e.target.value })}>
            <option value="mysql">MySQL</option>
            <option value="mariadb">MariaDB</option>
          </select>
          <button type="submit">Create DB</button>
        </form>

        <div className="db-list">
          {databases.map((d) => (
            <div key={d.id} className="db-item">
              <span>{d.name} ({d.engine})</span>
              <button type="button" className="danger" onClick={() => deleteDatabase(d.id)}>Delete</button>
            </div>
          ))}
        </div>
      </section>

      <section className="db-section">
        <h3>Create Database User</h3>
        <form className="db-form db-form-wide" onSubmit={createUser}>
          <input
            type="text"
            placeholder="username"
            pattern="^[a-zA-Z0-9_]{1,64}$"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="strong password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            minLength={10}
            required
          />
          <input
            type="text"
            placeholder="host (e.g. % or localhost)"
            value={userForm.host}
            onChange={(e) => setUserForm({ ...userForm, host: e.target.value })}
          />
          <button type="submit">Create User</button>
        </form>

        <div className="db-list">
          {dbUsers.map((u) => (
            <div key={u.id} className="db-item">
              <span>{u.username}@{u.host}</span>
              <button type="button" className="danger" onClick={() => deleteUser(u.id)}>Delete</button>
            </div>
          ))}
        </div>
      </section>

      <section className="db-section">
        <h3>Assign Privileges</h3>
        <form className="db-form db-form-wide" onSubmit={grantPrivileges}>
          <select
            value={grantForm.database_id}
            onChange={(e) => setGrantForm({ ...grantForm, database_id: e.target.value })}
            required
          >
            <option value="">Select database</option>
            {databases.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            value={grantForm.db_user_id}
            onChange={(e) => setGrantForm({ ...grantForm, db_user_id: e.target.value })}
            required
          >
            <option value="">Select user</option>
            {dbUsers.map((u) => <option key={u.id} value={u.id}>{u.username}@{u.host}</option>)}
          </select>
          <input
            type="text"
            placeholder="ALL PRIVILEGES or SELECT,INSERT"
            value={grantForm.privileges}
            onChange={(e) => setGrantForm({ ...grantForm, privileges: e.target.value.toUpperCase() })}
            required
          />
          <button type="submit">Grant</button>
        </form>

        <div className="db-list">
          {grants.map((g) => (
            <div key={g.id} className="db-item">
              <span>{g.username}@{g.host} → {g.database_name} ({g.privileges})</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
