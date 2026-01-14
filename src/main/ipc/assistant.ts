/**
 * Assistant IPC Handlers
 *
 * Handles assistant message sending and state management.
 * Uses mock implementation with simulated async processing and token streaming.
 */

import { ipcMain, BrowserWindow } from 'electron'
import {
  CHANNELS,
  type InvokeMap,
  type EventMap,
  type AssistantState,
  type AssistantToken
} from '../../shared'

// Current assistant state
let currentState: AssistantState = {
  status: 'idle',
  updatedAt: Date.now()
}

/**
 * Broadcast event to all renderer processes
 */
function broadcastEvent<K extends keyof EventMap>(channel: K, payload: EventMap[K]): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  })
}

/**
 * Update assistant state and broadcast to renderers
 */
function updateState(state: Partial<AssistantState>): void {
  currentState = {
    ...currentState,
    ...state,
    updatedAt: Date.now()
  }
  broadcastEvent(CHANNELS.events.ASSISTANT_STATE, currentState)
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Mock token generation - simulates streaming tokens from an LLM
 * @param messageId - Unique identifier for the message
 */
async function simulateTokenStream(messageId: string): Promise<void> {
  const mockTokens = ['Hello', '!', ' ', 'How', ' ', 'can', ' ', 'I', ' ', 'help', ' ', 'you', '?']

  for (let i = 0; i < mockTokens.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate network delay

    const token: AssistantToken = {
      messageId,
      token: mockTokens[i],
      index: i,
      done: i === mockTokens.length - 1
    }

    broadcastEvent(CHANNELS.events.ASSISTANT_TOKEN, token)
  }
}

/**
 * Register assistant IPC handlers
 */
export function registerAssistantHandlers(): void {
  // Handle send message request
  ipcMain.handle(
    CHANNELS.invoke.ASSISTANT_SEND_MESSAGE,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _event,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _request: InvokeMap[typeof CHANNELS.invoke.ASSISTANT_SEND_MESSAGE]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.ASSISTANT_SEND_MESSAGE]['res']> => {
      // Note: _request.text is available but unused in mock implementation
      const messageId = generateMessageId()
      const createdAt = Date.now()

      // Update state to "thinking"
      updateState({
        status: 'thinking',
        messageId
      })

      // Simulate async processing with token streaming
      // In production, this would call an actual LLM API
      setTimeout(async () => {
        // Update state to "responding"
        updateState({
          status: 'responding',
          messageId
        })

        // Stream mock tokens
        await simulateTokenStream(messageId)

        // Update state back to "idle"
        updateState({
          status: 'idle',
          messageId: undefined
        })
      }, 500) // Small delay before starting response

      return {
        accepted: true,
        messageId,
        createdAt
      }
    }
  )
}
