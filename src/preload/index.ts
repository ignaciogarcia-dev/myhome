import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { CHANNELS, type InvokeMap } from '../shared'

/**
 * Typed API exposed to renderer process
 * All IPC calls are type-safe using shared contracts
 */
const api = {
  system: {
    /**
     * Ping the main process to test connectivity
     */
    ping: async (): Promise<InvokeMap[typeof CHANNELS.invoke.SYSTEM_PING]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.SYSTEM_PING)
    }
  },

  settings: {
    /**
     * Get current settings
     */
    get: async (): Promise<InvokeMap[typeof CHANNELS.invoke.SETTINGS_GET]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.SETTINGS_GET)
    },

    /**
     * Update settings (partial merge)
     */
    set: async (
      partial: InvokeMap[typeof CHANNELS.invoke.SETTINGS_SET]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.SETTINGS_SET]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.SETTINGS_SET, partial)
    }
  },

  secrets: {
    /**
     * Set OpenAI API key
     */
    setOpenAIKey: async (
      apiKey: string
    ): Promise<InvokeMap[typeof CHANNELS.invoke.SECRETS_SET_OPENAI_KEY]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.SECRETS_SET_OPENAI_KEY, { apiKey })
    },

    /**
     * Check if OpenAI API key exists
     */
    hasOpenAIKey: async (): Promise<
      InvokeMap[typeof CHANNELS.invoke.SECRETS_HAS_OPENAI_KEY]['res']
    > => {
      return await ipcRenderer.invoke(CHANNELS.invoke.SECRETS_HAS_OPENAI_KEY)
    },

    /**
     * Clear OpenAI API key
     */
    clearOpenAIKey: async (): Promise<
      InvokeMap[typeof CHANNELS.invoke.SECRETS_CLEAR_OPENAI_KEY]['res']
    > => {
      return await ipcRenderer.invoke(CHANNELS.invoke.SECRETS_CLEAR_OPENAI_KEY)
    }
  },

  realtime: {
    /**
     * Get Realtime API session (ephemeral token)
     */
    getSession: async (
      payload: InvokeMap[typeof CHANNELS.invoke.REALTIME_GET_SESSION]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.REALTIME_GET_SESSION]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.REALTIME_GET_SESSION, payload)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
