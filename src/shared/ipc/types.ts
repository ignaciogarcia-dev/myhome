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
}

// Payload mapping for event channels
export interface EventMap {
  [CHANNELS.events.ASSISTANT_STATE]: AssistantState
  [CHANNELS.events.ASSISTANT_TOKEN]: AssistantToken
}

// Type helpers for type-safe IPC calls
export type InvokeRequest<K extends keyof InvokeMap> = InvokeMap[K]['req']
export type InvokeResponse<K extends keyof InvokeMap> = InvokeMap[K]['res']
export type EventPayload<K extends keyof EventMap> = EventMap[K]
