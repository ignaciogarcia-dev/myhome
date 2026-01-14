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
    ASSISTANT_SEND_MESSAGE: 'assistant:send-message'
  },
  events: {
    ASSISTANT_STATE: 'assistant:state',
    ASSISTANT_TOKEN: 'assistant:token'
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
