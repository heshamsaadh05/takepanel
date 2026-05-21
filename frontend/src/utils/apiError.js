export function formatApiError(error, fallback = 'Request failed') {
  const data = error?.response?.data

  if (!data) return fallback

  if (typeof data.error === 'string' && data.error) {
    if (typeof data.details === 'string' && data.details.trim()) {
      return `${data.error}: ${data.details.trim()}`
    }

    return data.error
  }

  if (typeof data.details === 'string' && data.details.trim()) {
    return data.details.trim()
  }

  if (data.errors && typeof data.errors === 'object') {
    const entries = Object.entries(data.errors)
    if (entries.length > 0) {
      const [field, messages] = entries[0]
      const message = Array.isArray(messages) ? messages.join(', ') : String(messages)
      return `${field}: ${message}`
    }
  }

  return fallback
}
