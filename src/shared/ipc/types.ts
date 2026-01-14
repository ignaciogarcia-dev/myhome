/**
 * IPC Type Mappings
 *
 * Defines request/response types for each IPC channel using a mapping pattern
 * for type safety and consistency.
 */

import type { Settings, PartialSettings } from '../types/settings'
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
  [CHANNELS.invoke.SECRETS_SET_OPENAI_KEY]: {
    req: { apiKey: string }
    res: { success: boolean }
  }
  [CHANNELS.invoke.SECRETS_HAS_OPENAI_KEY]: {
    req: void
    res: { hasKey: boolean }
  }
  [CHANNELS.invoke.SECRETS_CLEAR_OPENAI_KEY]: {
    req: void
    res: { success: boolean }
  }
  [CHANNELS.invoke.REALTIME_GET_SESSION]: {
    req: { backendUrl?: string }
    res: { clientSecret: string; sessionId: string; expiresAt: number }
  }
}

// Type helpers for type-safe IPC calls
export type InvokeRequest<K extends keyof InvokeMap> = InvokeMap[K]['req']
export type InvokeResponse<K extends keyof InvokeMap> = InvokeMap[K]['res']
