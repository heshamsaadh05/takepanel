import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const actionCards = [
  {
    title: 'Create a New Account',
    description: 'Provision a domain, username, password, and initial hosting defaults.',
    tone: 'blue',
    href: '#create-account',
    anchor: true,
  },
  {
    title: 'Modify an Account',
    description: 'Review existing hosting accounts and prepare them for edits.',
    tone: 'indigo',
    href: '#accounts-list',
    anchor: true,
  },
  {
    title: 'Password Modification',
    description: 'Rotate account passwords and keep access secure.',
    tone: 'violet',
    href: '#accounts-list',
    anchor: true,
  },
  {
    title: 'Account Suspension',
    description: 'Temporarily disable access while keeping the site data intact.',
    tone: 'rose',
    href: '#accounts-list',
    anchor: true,
  },
  {
    title: 'Manage Shell Access',
    description: 'Open the FTP and SFTP management page for directory access.',
    tone: 'amber',
    href: '/ftp',
  },
  {
    title: 'Email All Users',
    description: 'Go to mailbox management for existing domains.',
    tone: 'teal',
    href: '/email',
  },
  {
    title: 'DNS Settings',
    description: 'Jump to zone and record management.',
    tone: 'slate',
    href: '/dns',
  },
  {
    title: 'Websites',
    description: 'Open the domain and virtual host management page.',
    tone: 'blue',
    href: '/sites',
  },
]

const packageOptions = ['Starter', 'Standard', 'Business', 'Alpha-Deluxe']
const themeOptions = [
  { value: 'jupiter', label: 'jupiter' },
  { value: 'paper_lantern', label: 'paper_lantern' },
  { value: 'classic', label: 'classic' },
]
const localeOptions = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
]
const routingOptions = [
  { value: 'local', label: 'Local Mail Exchanger' },
  { value: 'remote', label: 'Remote Mail Exchanger' },
  { value: 'auto', label: 'Automatic Detection' },
]

const initialForm = {
  domain: '',
  username: '',
  password: '',
  confirm_password: '',
  email: '',
  package_name: 'Starter',
  select_options_manually: false,
  server_type: 'nginx',
  cgi_access: true,
  cpanel_theme: 'jupiter',
  locale: 'en',
  enable_apache_spamassassin: true,
  enable_spam_box: true,
  mail_routing: 'local',
  shell_access: false,
  dns_enabled: true,
}

function statusTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'active') return 'success'
  if (normalized === 'provisioning') return 'warning'
  if (normalized === 'stopped' || normalized === 'suspended') return 'muted'
  return 'muted'
}

function passwordStrength(password) {
  const value = String(password || '')
  if (!value) return { label: 'Very Weak', score: 0 }

  const checks = [
    value.length >= 10,
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ]
  const score = Math.min(100, checks.filter(Boolean).length * 20 + Math.min(20, value.length))

  if (score >= 90) return { label: 'Very Strong', score }
  if (score >= 75) return { label: 'Strong', score }
  if (score >= 55) return { label: 'Good', score }
  if (score >= 35) return { label: 'Fair', score }
  return { label: 'Weak', score }
}

function generatePassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  const random = new Uint32Array(length)

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(random)
    return Array.from(random, (value) => alphabet[value % alphabet.length]).join('')
  }

  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function Panel({ eyebrow, title, subtitle, actions, children, id }) {
  return (
    <section className="dashboard-panel" id={id}>
      <div className="panel-head">
        <div>
          {eyebrow ? <p className="panel-eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}

export default function AccountFunctionsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(initialForm)
  const [busyId, setBusyId] = useState(null)

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/hosting/accounts')
      setAccounts(res.data.items || [])
      setError('')
    } catch {
      setError('Failed to load hosting accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const strength = useMemo(() => passwordStrength(form.password), [form.password])
  const confirmMismatch = form.confirm_password && form.password !== form.confirm_password
  const activeAccounts = accounts.filter((account) => account.status === 'active').length

  const onGeneratePassword = () => {
    const password = generatePassword()
    setForm((current) => ({ ...current, password, confirm_password: password }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }

    try {
      const payload = {
        ...form,
        domain: form.domain.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
      }
      const res = await api.post('/hosting/accounts', payload)
      setSuccess(`Account ${res.data.domain} created successfully`)
      setForm(initialForm)
      await loadAccounts()
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.errors?.confirm_password?.[0] || 'Failed to create account')
    }
  }

  const deleteAccount = async (id) => {
    setBusyId(id)
    setError('')
    setSuccess('')
    try {
      await api.delete(`/hosting/accounts/${id}`)
      await loadAccounts()
      setSuccess('Account removed successfully')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to remove account')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="account-functions-page">
      <section className="dashboard-panel account-hero">
        <div className="panel-head">
          <div>
            <p className="panel-eyebrow">Account Functions</p>
            <h2>Create a New Account</h2>
            <p className="panel-subtitle">
              WHM-style account creation for a new hosting domain, username, FTP access, and the core options we can
              already provision today.
            </p>
          </div>
          <div className="panel-actions">
            <span className="status-pill success">{activeAccounts} active accounts</span>
            <span className="status-pill">{accounts.length} total</span>
          </div>
        </div>

        <div className="panel-body">
          <div className="account-actions-grid">
            {actionCards.map((card) =>
              card.anchor ? (
                <a key={card.title} href={card.href} className={`action-card tone-${card.tone}`}>
                  <span className="action-card-icon">+</span>
                  <div>
                    <strong>{card.title}</strong>
                    <p>{card.description}</p>
                  </div>
                </a>
              ) : (
                <Link key={card.title} to={card.href} className={`action-card tone-${card.tone}`}>
                  <span className="action-card-icon">{card.title.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{card.title}</strong>
                    <p>{card.description}</p>
                  </div>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      <Panel
        id="create-account"
        eyebrow="Domain Information"
        title="Create a New Account"
        subtitle="Fill in the primary domain, account username, password, and contact email."
        actions={<span className="status-pill">Website + FTP provisioning</span>}
      >
        <form className="account-form" onSubmit={onSubmit}>
          <div className="account-grid account-grid-2">
            <label className="field-card">
              <span>Domain</span>
              <input
                type="text"
                placeholder="example.com"
                pattern="^((?!-)[A-Za-z0-9-]{1,63}\\.)+[A-Za-z]{2,63}$"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                required
              />
            </label>

            <label className="field-card">
              <span>Username</span>
              <input
                type="text"
                placeholder="website user"
                pattern="^[a-z_][a-z0-9_-]{2,31}$"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                required
              />
            </label>

            <label className="field-card">
              <span>Password</span>
              <div className="inline-control">
                <input
                  type="password"
                  placeholder="strong password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={10}
                  required
                />
                <button type="button" className="ghost-button" onClick={onGeneratePassword}>
                  Password Generator
                </button>
              </div>
            </label>

            <label className="field-card">
              <span>Re-type Password</span>
              <input
                type="password"
                placeholder="confirm password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                minLength={10}
                required
              />
            </label>

            <label className="field-card field-card-wide">
              <span>Strength</span>
              <div className="strength-shell">
                <div className="strength-head">
                  <strong>{strength.label}</strong>
                  <em>{strength.score}/100</em>
                </div>
                <div className="meter">
                  <span style={{ width: `${strength.score}%` }} />
                </div>
              </div>
              {confirmMismatch ? <small className="helper warning-text">Passwords do not match yet.</small> : null}
            </label>

            <label className="field-card field-card-wide">
              <span>Email</span>
              <input
                type="email"
                placeholder="owner@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
          </div>

          <section className="option-panel">
            <div className="option-head">
              <h3>Package</h3>
              <p>Choose the hosting defaults to save with the account.</p>
            </div>
            <div className="account-grid account-grid-3">
              <label className="field-card">
                <span>Choose a Package</span>
                <select
                  value={form.package_name}
                  onChange={(e) => setForm({ ...form, package_name: e.target.value })}
                >
                  {packageOptions.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-card">
                <span>Server Type</span>
                <select
                  value={form.server_type}
                  onChange={(e) => setForm({ ...form, server_type: e.target.value })}
                >
                  <option value="nginx">Nginx</option>
                  <option value="apache">Apache</option>
                </select>
              </label>
              <label className="field-card toggle-card">
                <span>Select Options Manually</span>
                <input
                  type="checkbox"
                  checked={form.select_options_manually}
                  onChange={(e) => setForm({ ...form, select_options_manually: e.target.checked })}
                />
              </label>
            </div>
          </section>

          <section className="option-panel">
            <div className="option-head">
              <h3>Core Options</h3>
              <p>These options are stored with the account now and can be expanded later.</p>
            </div>
            <div className="account-grid account-grid-2">
              <label className="field-card toggle-card">
                <span>CGI Access</span>
                <input
                  type="checkbox"
                  checked={form.cgi_access}
                  onChange={(e) => setForm({ ...form, cgi_access: e.target.checked })}
                />
              </label>
              <label className="field-card">
                <span>cPanel Theme</span>
                <select
                  value={form.cpanel_theme}
                  onChange={(e) => setForm({ ...form, cpanel_theme: e.target.value })}
                >
                  {themeOptions.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-card">
                <span>Locale</span>
                <select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>
                  {localeOptions.map((locale) => (
                    <option key={locale.value} value={locale.value}>
                      {locale.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-card toggle-card">
                <span>Enable Apache SpamAssassin</span>
                <input
                  type="checkbox"
                  checked={form.enable_apache_spamassassin}
                  onChange={(e) => setForm({ ...form, enable_apache_spamassassin: e.target.checked })}
                />
              </label>
              <label className="field-card toggle-card">
                <span>Enable Spam Box</span>
                <input
                  type="checkbox"
                  checked={form.enable_spam_box}
                  onChange={(e) => setForm({ ...form, enable_spam_box: e.target.checked })}
                />
              </label>
            </div>
          </section>

          <details className="account-details" open>
            <summary>Mail Routing Settings <span>(optional)</span></summary>
            <div className="account-grid account-grid-1">
              <label className="field-card">
                <span>Mail Routing</span>
                <select
                  value={form.mail_routing}
                  onChange={(e) => setForm({ ...form, mail_routing: e.target.value })}
                >
                  {routingOptions.map((routing) => (
                    <option key={routing.value} value={routing.value}>
                      {routing.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <details className="account-details">
            <summary>Reseller Settings <span>(optional)</span></summary>
            <div className="account-grid account-grid-2">
              <label className="field-card toggle-card">
                <span>Shell Access</span>
                <input
                  type="checkbox"
                  checked={form.shell_access}
                  onChange={(e) => setForm({ ...form, shell_access: e.target.checked })}
                />
              </label>
              <div className="field-card">
                <span>Permission note</span>
                <p className="helper">
                  Shell access is saved now and can be tied to stricter SSH policies in a later step.
                </p>
              </div>
            </div>
          </details>

          <details className="account-details">
            <summary>DNS Settings <span>(optional)</span></summary>
            <div className="account-grid account-grid-2">
              <label className="field-card toggle-card">
                <span>Enable DNS</span>
                <input
                  type="checkbox"
                  checked={form.dns_enabled}
                  onChange={(e) => setForm({ ...form, dns_enabled: e.target.checked })}
                />
              </label>
              <div className="field-card">
                <span>Provisioning note</span>
                <p className="helper">
                  DNS automation can be attached later to create zones and default records on submit.
                </p>
              </div>
            </div>
          </details>

          <div className="account-actions-row">
            <button type="submit" className="primary-button">
              Create
            </button>
            <button type="button" className="secondary-button" onClick={() => setForm(initialForm)}>
              Reset
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        id="accounts-list"
        eyebrow="Existing Accounts"
        title="Managed Hosting Accounts"
        subtitle="Accounts created through TakePanel appear here for review and removal."
      >
        {loading ? (
          <div className="empty-note">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="empty-note">No hosting accounts found yet.</div>
        ) : (
          <div className="account-list">
            {accounts.map((account) => (
              <article key={account.id} className="account-item">
                <div>
                  <div className="account-item-top">
                    <strong>{account.domain}</strong>
                    <span className={`status-pill ${statusTone(account.status)}`}>{account.status}</span>
                  </div>
                  <p>{account.username} · {account.email}</p>
                  <small>
                    Package: {account.package_name} · Theme: {account.cpanel_theme} · Locale: {account.locale}
                  </small>
                  <small>
                    Web root: {account.web_root}
                  </small>
                </div>
                <div className="account-item-actions">
                  <Link to="/sites" className="secondary-button">
                    Website Manager
                  </Link>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={busyId === account.id}
                    onClick={() => deleteAccount(account.id)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {error ? <div className="dashboard-error">{error}</div> : null}
      {success ? <div className="dashboard-loading success-message">{success}</div> : null}
    </div>
  )
}
