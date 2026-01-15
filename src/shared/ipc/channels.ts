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
    SECRETS_SET_OPENWEATHERMAP_KEY: 'secrets:set-openweathermap-key',
    SECRETS_HAS_OPENWEATHERMAP_KEY: 'secrets:has-openweathermap-key',
    SECRETS_CLEAR_OPENWEATHERMAP_KEY: 'secrets:clear-openweathermap-key',
    WEATHER_GEOCODE: 'weather:geocode',
    WEATHER_GET_WEATHER: 'weather:get',
    REALTIME_GET_SESSION: 'realtime:get-session'
  }
} as const

export const INVOKE = CHANNELS.invoke

// Key helpers (useful for mapped types)
export type InvokeKey = keyof typeof CHANNELS.invoke

// Value helpers (channel string literals)
export type InvokeChannel = (typeof CHANNELS.invoke)[InvokeKey]
