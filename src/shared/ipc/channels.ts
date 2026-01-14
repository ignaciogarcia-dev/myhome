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

// Type helpers for channel names
export type InvokeChannel = typeof CHANNELS.invoke[keyof typeof CHANNELS.invoke]
export type EventChannel = typeof CHANNELS.events[keyof typeof CHANNELS.events]
