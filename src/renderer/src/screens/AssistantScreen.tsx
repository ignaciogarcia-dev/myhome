import React, { useState } from 'react'
import { useRealtimeAgent } from '../hooks/useRealtimeAgent'

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

  return (
    <div style={{ padding: '20px' }}>
      <h2>Assistant</h2>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}

      {/* Voice Control UI */}
      <div
        style={{
          marginBottom: '20px',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Realtime Voice Assistant</h3>
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={handleConnect}
            disabled={!realtimeAgent.isSessionStarted && realtimeAgent.isSessionActive}
            style={{ marginRight: '10px', padding: '10px 20px' }}
          >
            {realtimeAgent.isSessionStarted ? 'Disconnect' : 'Connect'}
          </button>
          <button
            onClick={handleMuteToggle}
            disabled={!realtimeAgent.isSessionActive}
            style={{ marginRight: '10px', padding: '10px 20px' }}
          >
            {realtimeAgent.isListening ? 'Mute' : 'Unmute'}
          </button>
          {realtimeAgent.isSessionActive && (
            <span
              style={{
                color: realtimeAgent.isListening ? '#4caf50' : '#ff9800',
                fontWeight: 'bold',
                marginLeft: '10px'
              }}
            >
              {realtimeAgent.isListening ? '● Listening' : '○ Muted'}
            </span>
          )}
        </div>

        {realtimeAgent.messages.length > 0 && (
          <div style={{ marginBottom: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            <strong>Conversation:</strong>
            {realtimeAgent.messages
              .slice()
              .reverse()
              .map((msg) => (
                <div key={msg.id} style={{ marginTop: '10px', padding: '5px' }}>
                  {msg.user && (
                    <div style={{ color: '#2196f3', marginBottom: '5px' }}>
                      <strong>You:</strong> {msg.user}
                    </div>
                  )}
                  {msg.bot && (
                    <div style={{ color: '#4caf50', marginBottom: '5px' }}>
                      <strong>Assistant:</strong> {msg.bot}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {realtimeAgent.error && (
          <div style={{ marginBottom: '10px', color: 'red' }}>
            <strong>Realtime Error:</strong> {realtimeAgent.error}
          </div>
        )}
      </div>
    </div>
  )
}
