import { NavLink, Outlet } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const navGroups = [
  {
    title: 'Server Configuration',
    items: [
      { to: '/', label: 'Home', meta: 'Overview & shortcuts' },
      { to: '/monitoring', label: 'Monitoring', meta: 'CPU, RAM, disk, network' }
    ]
  },
  {
    title: 'Account Functions',
    items: [
      { to: '/account-functions', label: 'Account Functions', meta: 'Create and manage accounts' },
      { to: '/sites', label: 'Websites', meta: 'Domains and vhosts' },
      { to: '/databases', label: 'Databases', meta: 'MySQL / MariaDB' },
      { to: '/email', label: 'Email', meta: 'Postfix + Dovecot' },
      { to: '/ftp', label: 'FTP / SFTP', meta: 'User accounts' }
    ]
  },
  {
    title: 'Domains & Recovery',
    items: [
      { to: '/dns', label: 'DNS', meta: 'Zones and records' },
      { to: '/backups', label: 'Backups', meta: 'Run and restore' }
    ]
  }
]

export default function MainLayout() {
  const { user, logout } = useAuth()
  const [search, setSearch] = useState('')

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return navGroups

    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = `${group.title} ${item.label} ${item.meta}`.toLowerCase()
          return haystack.includes(query)
        })
      }))
      .filter((group) => group.items.length > 0)
  }, [search])

  return (
    <div className="whm-shell">
      <aside className="whm-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">TP</div>
          <div>
            <h1>TakePanel</h1>
            <p>WHM-style server control</p>
          </div>
        </div>

        <label className="sidebar-search">
          <span>Search Tools and Accounts</span>
          <input
            type="search"
            placeholder="Search modules"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="sidebar-groups">
          {filteredGroups.map((group) => (
            <section key={group.title} className="sidebar-group">
              <h2>{group.title}</h2>
              <nav>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} end className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
                    <span>{item.label}</span>
                    <small>{item.meta}</small>
                  </NavLink>
                ))}
              </nav>
            </section>
          ))}
        </div>
      </aside>

      <main className="whm-main">
        <header className="whm-topbar">
          <div className="topbar-identity">
            <strong>{user?.email}</strong>
            <span>({user?.role})</span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-chip">IP mode</span>
            <button type="button" onClick={logout}>Logout</button>
          </div>
        </header>

        <section className="whm-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
