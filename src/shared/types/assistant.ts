/**
 * Assistant Domain Types
 * 
 * Defines types for assistant interactions, state management, and streaming.
 */

export type AssistantStatus = 'idle' | 'thinking' | 'responding' | 'error'

export interface AssistantState {
  status: AssistantStatus
  messageId?: string
  updatedAt: number
  error?: {
    message: string
    code?: string
  }
}

export interface AssistantToken {
  messageId: string
  token: string
  index?: number
  done?: boolean
}

export interface SendMessageRequest {
  text: string
}

export interface SendMessageResponse {
  accepted: boolean
  messageId: string
  createdAt: number
}
