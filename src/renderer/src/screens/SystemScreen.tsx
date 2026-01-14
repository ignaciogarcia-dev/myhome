import React, { useState } from 'react'

/**
 * System Screen - Tests system.ping() IPC call
 */
export default function SystemScreen(): React.JSX.Element {
  const [result, setResult] = useState<{ success: boolean; timestamp: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePing = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const response = await window.api.system.ping()
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>System Test</h2>
      <button onClick={handlePing} disabled={loading} style={{ marginBottom: '20px' }}>
        {loading ? 'Pinging...' : 'Ping'}
      </button>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div>
          <div>Success: {result.success ? 'Yes' : 'No'}</div>
          <div>Timestamp: {new Date(result.timestamp).toLocaleString()}</div>
        </div>
      )}
    </div>
  )
}
