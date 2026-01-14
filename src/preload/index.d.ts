import { ElectronAPI } from '@electron-toolkit/preload'
import { CHANNELS, type InvokeMap, type EventMap } from '../shared'

/**
 * Type-safe unsubscribe function returned from event listeners
 */
type Unsubscribe = () => void

/**
 * Typed API interface exposed to renderer process
 * Matches the implementation in src/preload/index.ts
 */
export interface WindowApi {
  system: {
    /**
     * Ping the main process to test connectivity
     */
    ping: () => Promise<InvokeMap[typeof CHANNELS.invoke.SYSTEM_PING]['res']>
  }

  settings: {
    /**
     * Get current settings
     */
    get: () => Promise<InvokeMap[typeof CHANNELS.invoke.SETTINGS_GET]['res']>

    /**
     * Update settings (partial merge)
     */
    set: (
      partial: InvokeMap[typeof CHANNELS.invoke.SETTINGS_SET]['req']
    ) => Promise<InvokeMap[typeof CHANNELS.invoke.SETTINGS_SET]['res']>
  }

  assistant: {
    /**
     * Send a message to the assistant
     */
    sendMessage: (
      text: string
    ) => Promise<InvokeMap[typeof CHANNELS.invoke.ASSISTANT_SEND_MESSAGE]['res']>

    /**
     * Cancel the current assistant operation
     */
    cancel: () => Promise<InvokeMap[typeof CHANNELS.invoke.ASSISTANT_CANCEL]['res']>

    /**
     * Subscribe to assistant events
     * Returns an unsubscribe function for cleanup
     */
    on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): Unsubscribe

    /**
     * Unsubscribe from assistant events
     * Note: Prefer using the unsubscribe function returned from .on()
     */
    off: (event: keyof EventMap, callback: (...args: unknown[]) => void) => void
  }

  audio: {
    /**
     * Start listening to audio input
     */
    startListening: () => Promise<InvokeMap[typeof CHANNELS.invoke.AUDIO_START_LISTENING]['res']>

    /**
     * Stop listening to audio input
     */
    stopListening: () => Promise<InvokeMap[typeof CHANNELS.invoke.AUDIO_STOP_LISTENING]['res']>

    /**
     * Subscribe to audio events
     * Returns an unsubscribe function for cleanup
     */
    on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): Unsubscribe
  }

  stt: {
    /**
     * Transcribe audio to text
     */
    transcribe: (
      payload: InvokeMap[typeof CHANNELS.invoke.STT_TRANSCRIBE]['req']
    ) => Promise<InvokeMap[typeof CHANNELS.invoke.STT_TRANSCRIBE]['res']>
  }

  secrets: {
    /**
     * Set OpenAI API key
     */
    setOpenAIKey: (
      apiKey: string
    ) => Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_SET_OPENAI_KEY]['res']>

    /**
     * Check if OpenAI API key exists
     */
    hasOpenAIKey: () => Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_HAS_OPENAI_KEY]['res']>

    /**
     * Clear OpenAI API key
     */
    clearOpenAIKey: () => Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_CLEAR_OPENAI_KEY]['res']>
  }

  tts: {
    /**
     * Speak text using TTS
     */
    speak: (
      payload: InvokeMap[typeof CHANNELS.invoke.TTS_SPEAK]['req']
    ) => Promise<InvokeMap[typeof CHANNELS.invoke.TTS_SPEAK]['res']>

    /**
     * Stop current TTS playback
     */
    stop: () => Promise<InvokeMap[typeof CHANNELS.invoke.TTS_STOP]['res']>

    /**
     * Subscribe to TTS events
     * Returns an unsubscribe function for cleanup
     */
    on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): Unsubscribe
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowApi
  }
}
