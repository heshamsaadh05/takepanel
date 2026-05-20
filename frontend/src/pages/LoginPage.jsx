import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="center">
      <form className="card" onSubmit={submit}>
        <h2>TakePanel Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Sign In</button>
      </form>
    </div>
  )
}
