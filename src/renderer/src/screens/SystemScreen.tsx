import React, { useState } from 'react'
import { cn } from '@renderer/lib/utils'

/**
 * System Screen - Tests system.ping() IPC call
 */
export default function SystemScreen(): React.JSX.Element {
  const [result, setResult] = useState<{ success: boolean; timestamp: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusLabel = loading ? 'Pinging' : result?.success ? 'Online' : 'Idle'
  const statusTone = loading
    ? 'bg-amber-100 text-amber-700'
    : result?.success
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-200 text-slate-500'
  const statusDot = loading
    ? 'bg-amber-400'
    : result?.success
      ? 'bg-emerald-500'
      : 'bg-slate-400'

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
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="ha-label">System</p>
          <h2 className="ha-title">Diagnostics</h2>
          <p className="ha-subtitle">Ping the core process and review the response.</p>
        </div>
        <button type="button" onClick={handlePing} disabled={loading} className="ha-button">
          {loading ? 'Pinging...' : 'Ping'}
        </button>
      </div>

      <div className="ha-card p-6 animate-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">System health</div>
            <div className="text-sm text-slate-500">
              Latest response from the main process.
            </div>
          </div>
          <span className={cn('ha-pill', statusTone)}>
            <span className={cn('h-2 w-2 rounded-full', statusDot)} />
            {statusLabel}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="ha-label">Last Result</div>
            <div className="text-xl font-semibold text-slate-900">
              {result ? (result.success ? 'Success' : 'Failed') : 'Not run'}
            </div>
          </div>
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="ha-label">Timestamp</div>
            <div className="text-sm text-slate-700">
              {result ? new Date(result.timestamp).toLocaleString() : '--'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  )
}
