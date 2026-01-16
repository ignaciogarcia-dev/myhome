import React, { useState } from 'react'
import { useRealtimeAgent } from '../hooks/useRealtimeAgent'
import { cn } from '@renderer/lib/utils'

/**
 * Assistant Screen - Realtime voice-only assistant using WebRTC
 */
export default function AssistantScreen(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)

  // Realtime agent hook
  const realtimeAgent = useRealtimeAgent({
    onError: (err) => {
      console.error('[Realtime] Error:', err)
      setError(err.message)
    }
  })

  const handleConnect = async (): Promise<void> => {
    try {
      if (realtimeAgent.isSessionStarted) {
        realtimeAgent.stopSession()
        setError(null)
      } else {
        await realtimeAgent.startSession()
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    }
  }

  const handleMuteToggle = async (): Promise<void> => {
    try {
      if (realtimeAgent.isListening) {
        realtimeAgent.stopRecording()
      } else {
        await realtimeAgent.startRecording()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle microphone')
    }
  }

  const isConnecting = realtimeAgent.isSessionStarted && !realtimeAgent.isSessionActive
  const statusLabel = realtimeAgent.isSessionActive
    ? realtimeAgent.isListening
      ? 'Listening'
      : 'Muted'
    : isConnecting
      ? 'Connecting'
      : 'Disconnected'
  const statusTone = realtimeAgent.isSessionActive
    ? realtimeAgent.isListening
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700'
    : isConnecting
      ? 'bg-sky-100 text-sky-700'
      : 'bg-slate-200 text-slate-500'
  const statusDot = realtimeAgent.isSessionActive
    ? realtimeAgent.isListening
      ? 'bg-emerald-500'
      : 'bg-amber-400'
    : isConnecting
      ? 'bg-sky-500'
      : 'bg-slate-400'

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="ha-label">Assistant</p>
          <h2 className="ha-title">Realtime Voice</h2>
          <p className="ha-subtitle">Hands-free assistance with live audio streaming.</p>
        </div>
        <span className={cn('ha-pill', statusTone)}>
          <span className={cn('h-2 w-2 rounded-full', statusDot)} />
          {statusLabel}
        </span>
      </div>

      {(error || realtimeAgent.error) && (
        <div className="ha-card border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
          <strong>Error:</strong> {error || realtimeAgent.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="ha-card p-6 animate-fade-up">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleConnect} className="ha-button">
              {realtimeAgent.isSessionStarted ? 'Disconnect' : 'Connect'}
            </button>
            <button
              type="button"
              onClick={handleMuteToggle}
              disabled={!realtimeAgent.isSessionActive}
              className="ha-button-secondary"
            >
              {realtimeAgent.isListening ? 'Mute' : 'Unmute'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/60 p-4">
              <div className="ha-label">Session</div>
              <div className="text-sm font-semibold text-slate-800">
                {realtimeAgent.isSessionStarted ? 'Started' : 'Stopped'}
              </div>
            </div>
            <div className="rounded-2xl bg-white/60 p-4">
              <div className="ha-label">Connection</div>
              <div className="text-sm font-semibold text-slate-800">
                {realtimeAgent.isSessionActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="rounded-2xl bg-white/60 p-4">
              <div className="ha-label">Microphone</div>
              <div className="text-sm font-semibold text-slate-800">
                {realtimeAgent.isListening ? 'On' : 'Off'}
              </div>
            </div>
          </div>
        </div>

        <div
          className="ha-card flex flex-col items-center justify-center gap-4 p-6 animate-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          <div
            className={cn(
              'ha-orb',
              realtimeAgent.isSessionActive ? 'animate-pulse-soft' : 'opacity-70'
            )}
          />
          <div className="text-sm text-slate-500">Say "Hey Assistant" to begin.</div>
          <span className="ha-tag">
            Audio {realtimeAgent.isSessionActive ? 'Live' : 'Idle'}
          </span>
        </div>
      </div>

      {realtimeAgent.messages.length > 0 ? (
        <div className="ha-card p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Conversation</div>
            <span className="ha-tag">{realtimeAgent.messages.length} turns</span>
          </div>
          <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-2">
            {realtimeAgent.messages
              .slice()
              .reverse()
              .map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.user && (
                    <div className="rounded-2xl bg-white/70 p-3 text-sm text-slate-700">
                      <div className="ha-label">You</div>
                      <div className="mt-1 text-slate-800">{msg.user}</div>
                    </div>
                  )}
                  {msg.bot && (
                    <div className="rounded-2xl bg-sky-50/80 p-3 text-sm text-slate-700">
                      <div className="ha-label">Assistant</div>
                      <div className="mt-1 text-slate-800">{msg.bot}</div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="ha-card p-6 text-sm text-slate-500 animate-fade-up">
          No conversation yet. Connect and start speaking to populate the timeline.
        </div>
      )}
    </div>
  )
}
