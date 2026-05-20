import { useEffect, useState } from 'react'
import api from '../api/client'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data))
  }, [])

  return (
    <div>
      <h2>Dashboard</h2>
      <pre>{JSON.stringify(summary, null, 2)}</pre>
    </div>
  )
}
