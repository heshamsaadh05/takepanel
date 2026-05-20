import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/sites', label: 'Websites' },
  { to: '/databases', label: 'Databases' },
  { to: '/email', label: 'Email' },
  { to: '/dns', label: 'DNS' },
  { to: '/ftp', label: 'FTP' },
  { to: '/backups', label: 'Backups' },
  { to: '/monitoring', label: 'Monitoring' }
]

export default function MainLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>TakePanel</h1>
        <nav>
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>{item.label}</Link>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>{user?.email} ({user?.role})</div>
          <button onClick={logout}>Logout</button>
        </header>
        <section className="page">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
