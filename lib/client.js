'use client'

import { useState } from 'react'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function request(path, options = {}) {
    setError('')
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Ocurrió un error')
      throw new Error(data.error || 'Ocurrió un error')
    }
    return data
  }

  return { loading, error, setError, request, setLoading }
}