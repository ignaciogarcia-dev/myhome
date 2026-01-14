/**
 * IPC Type Mappings
 *
 * Defines request/response types for each IPC channel using a mapping pattern
 * for type safety and consistency.
 */

import type { Settings, PartialSettings } from '../types/settings'
import type {
  AssistantState,
  AssistantToken,
  SendMessageRequest,
  SendMessageResponse
} from '../types/assistant'
import type { AudioState, AudioLevel } from '../types/audio'
import type { CHANNELS } from './channels'

// Request/Response mapping for invoke channels
export interface InvokeMap {
  [CHANNELS.invoke.SYSTEM_PING]: {
    req: void
    res: { success: boolean; timestamp: number }
  }
  [CHANNELS.invoke.SETTINGS_GET]: {
    req: void
    res: Settings
  }
  [CHANNELS.invoke.SETTINGS_SET]: {
    req: PartialSettings
    res: Settings // Return updated settings
  }
  [CHANNELS.invoke.ASSISTANT_SEND_MESSAGE]: {
    req: SendMessageRequest
    res: SendMessageResponse
  }
  [CHANNELS.invoke.ASSISTANT_CANCEL]: {
    req: void
    res: { success: boolean }
  }
  [CHANNELS.invoke.STT_TRANSCRIBE]: {
    req: {
      audioBase64: string
      mimeType: string
      durationMs: number
    }
    res: {
      text: string
      provider: 'mock'
      confidence?: number
    }
  }
  [CHANNELS.invoke.TTS_SPEAK]: {
    req: {
      text: string
      voice?: string
      rate?: number
      pitch?: number
      volume?: number
    }
    res: { success: boolean }
  }
  [CHANNELS.invoke.TTS_STOP]: {
    req: void
    res: { success: boolean }
  }
  [CHANNELS.invoke.AUDIO_START_LISTENING]: {
    req: void
    res: { success: boolean }
  }
  [CHANNELS.invoke.AUDIO_STOP_LISTENING]: {
    req: void
    res: { success: boolean }
  }
}

// Payload mapping for event channels
export interface EventMap {
  [CHANNELS.events.ASSISTANT_STATE]: AssistantState
  [CHANNELS.events.ASSISTANT_TOKEN]: AssistantToken
  [CHANNELS.events.AUDIO_STATE]: AudioState
  [CHANNELS.events.AUDIO_LEVEL]: AudioLevel
  [CHANNELS.events.TTS_SPEAK]: {
    text: string
    voice?: string
    rate?: number
    pitch?: number
    volume?: number
  }
  [CHANNELS.events.TTS_STOP]: void
}

// Type helpers for type-safe IPC calls
export type InvokeRequest<K extends keyof InvokeMap> = InvokeMap[K]['req']
export type InvokeResponse<K extends keyof InvokeMap> = InvokeMap[K]['res']
export type EventPayload<K extends keyof EventMap> = EventMap[K]
