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
    ASSISTANT_SEND_MESSAGE: 'assistant:send-message',
    ASSISTANT_CANCEL: 'assistant:cancel',
    STT_TRANSCRIBE: 'stt:transcribe',
    SECRETS_SET_OPENAI_KEY: 'secrets:set-openai-key',
    SECRETS_HAS_OPENAI_KEY: 'secrets:has-openai-key',
    SECRETS_CLEAR_OPENAI_KEY: 'secrets:clear-openai-key',
    TTS_SPEAK: 'tts:speak',
    TTS_STOP: 'tts:stop',
    AUDIO_START_LISTENING: 'audio:start-listening',
    AUDIO_STOP_LISTENING: 'audio:stop-listening'
  },
  events: {
    ASSISTANT_STATE: 'assistant:state',
    ASSISTANT_TOKEN: 'assistant:token',
    AUDIO_STATE: 'audio:state',
    AUDIO_LEVEL: 'audio:level',
    TTS_SPEAK: 'tts:speak',
    TTS_STOP: 'tts:stop'
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
