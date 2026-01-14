import { ElectronAPI } from '@electron-toolkit/preload'
import { CHANNELS, type InvokeMap } from '../shared'

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

  realtime: {
    /**
     * Get Realtime API session (ephemeral token)
     */
    getSession: (
      payload: InvokeMap[typeof CHANNELS.invoke.REALTIME_GET_SESSION]['req']
    ) => Promise<InvokeMap[typeof CHANNELS.invoke.REALTIME_GET_SESSION]['res']>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowApi
  }
}
