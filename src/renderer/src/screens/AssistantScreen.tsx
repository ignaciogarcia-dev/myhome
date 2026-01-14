import React, { useState, useEffect } from 'react'
import { CHANNELS } from '@shared/ipc/channels'
import type { AssistantStatus, AssistantState, AssistantToken } from '@shared/types/assistant'
import type { AudioState, AudioLevel } from '@shared/types/audio'

/**
 * Assistant Screen - Tests assistant.sendMessage() and event subscriptions
 */
export default function AssistantScreen(): React.JSX.Element {
  const [message, setMessage] = useState<string>('')
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [tokens, setTokens] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageId, setMessageId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Subscribe to assistant events
  useEffect(() => {
    let currentMessageId: string | null = null

    const unsubscribeState = window.api.assistant.on(
      CHANNELS.events.ASSISTANT_STATE,
      (state: AssistantState) => {
        setStatus(state.status)
        currentMessageId = state.messageId ?? null
        setMessageId(currentMessageId)
        if (state.error) {
          setError(state.error.message)
        }
      }
    )

    const unsubscribeToken = window.api.assistant.on(
      CHANNELS.events.ASSISTANT_TOKEN,
      (token: AssistantToken) => {
        setTokens((prev) => {
          // Only append tokens for the current message
          if (token.messageId === currentMessageId || !currentMessageId) {
            return [...prev, token.token]
          }
          return prev
        })
      }
    )

    // Cleanup on unmount
    return () => {
      unsubscribeState()
      unsubscribeToken()
    }
  }, []) // Only subscribe once on mount

  // Subscribe to audio events
  useEffect(() => {
    const unsubscribeState = window.api.audio.on(
      CHANNELS.events.AUDIO_STATE,
      (state: AudioState) => {
        setIsListening(state.isListening)
      }
    )

    const unsubscribeLevel = window.api.audio.on(
      CHANNELS.events.AUDIO_LEVEL,
      (level: AudioLevel) => {
        setAudioLevel(level.level)
      }
    )

    // Cleanup on unmount
    return () => {
      unsubscribeState()
      unsubscribeLevel()
    }
  }, [])

  // Ensure stopListening is called on unmount if currently listening
  useEffect(() => {
    return () => {
      if (isListening) {
        window.api.audio.stopListening().catch(() => {
          // Ignore errors during cleanup
        })
      }
    }
  }, [isListening])

  const handleSend = async (): Promise<void> => {
    if (!message.trim()) return

    setLoading(true)
    setError(null)
    setTokens([]) // Clear previous tokens
    setStatus(null)

    try {
      const response = await window.api.assistant.sendMessage(message)
      setMessageId(response.messageId)
      setMessage('') // Clear input
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !loading) {
      handleSend()
    }
  }

  const handleToggleListening = async (): Promise<void> => {
    try {
      if (isListening) {
        await window.api.audio.stopListening()
      } else {
        await window.api.audio.startListening()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle listening')
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
        <h3 style={{ marginTop: 0 }}>Voice Control</h3>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={handleToggleListening} style={{ marginRight: '10px' }}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <span>
            <strong>State:</strong> {isListening ? 'Listening' : 'Stopped'}
          </span>
        </div>
        <div>
          <strong>Level:</strong>
          <div
            style={{
              width: '200px',
              height: '20px',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              marginTop: '5px',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: `${audioLevel * 100}%`,
                height: '100%',
                backgroundColor: isListening ? '#4caf50' : '#ccc',
                transition: 'width 0.05s ease-out'
              }}
            />
          </div>
          <span style={{ fontSize: '12px' }}>{(audioLevel * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={loading}
          style={{ width: '300px', padding: '5px', marginRight: '10px' }}
        />
        <button onClick={handleSend} disabled={loading || !message.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div>
          <strong>Status:</strong> {status ?? 'idle'}
        </div>
        {messageId && (
          <div>
            <strong>Message ID:</strong> {messageId}
          </div>
        )}
      </div>

      <div>
        <h3>Response:</h3>
        <div
          style={{
            border: '1px solid #ccc',
            padding: '10px',
            minHeight: '100px',
            backgroundColor: '#f9f9f9',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
        >
          {tokens.length > 0 ? tokens.join('') : '(No response yet)'}
        </div>
      </div>
    </div>
  )
}
