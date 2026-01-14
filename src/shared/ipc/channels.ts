/**
 * IPC Channel Constants
 *
 * Centralized channel names to prevent typos and ensure consistency
 * across main process, preload, and renderer.
 */
export const CHANNELS = {
  invoke: {
    SYSTEM_PING: 'system:ping',
    SETTINGS_GET: 'settings:get',
    SETTINGS_SET: 'settings:set',
    SECRETS_SET_OPENAI_KEY: 'secrets:set-openai-key',
    SECRETS_HAS_OPENAI_KEY: 'secrets:has-openai-key',
    SECRETS_CLEAR_OPENAI_KEY: 'secrets:clear-openai-key',
    REALTIME_GET_SESSION: 'realtime:get-session'
  },
  events: {
    REALTIME_TRANSCRIPTION_DELTA: 'realtime:transcription-delta',
    REALTIME_TRANSCRIPTION_COMPLETE: 'realtime:transcription-complete'
  }
} as const

export const INVOKE = CHANNELS.invoke
export const EVENTS = CHANNELS.events

// Key helpers (useful for mapped types)
export type InvokeKey = keyof typeof CHANNELS.invoke
export type EventKey = keyof typeof CHANNELS.events

// Value helpers (channel string literals)
export type InvokeChannel = (typeof CHANNELS.invoke)[InvokeKey]
export type EventChannel = (typeof CHANNELS.events)[EventKey]
