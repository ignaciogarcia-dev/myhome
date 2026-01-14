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

  return (
    <div style={{ padding: '20px' }}>
      <h2>Assistant</h2>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}

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
