import axios from 'axios'

const api = axios.create({
  // Use same-origin API by default so production works on any IP/domain without
  // hard-coding localhost into the browser bundle.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
