import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { CHANNELS, type InvokeMap, type EventMap } from '../shared'

/**
 * Type-safe unsubscribe function returned from event listeners
 */
type Unsubscribe = () => void

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

  assistant: {
    /**
     * Send a message to the assistant
     */
    sendMessage: async (
      text: string
    ): Promise<InvokeMap[typeof CHANNELS.invoke.ASSISTANT_SEND_MESSAGE]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.ASSISTANT_SEND_MESSAGE, { text })
    },

    /**
     * Subscribe to assistant events
     * Returns an unsubscribe function for cleanup
     *
     * Usage:
     *   const unsubscribe = window.api.assistant.on(CHANNELS.events.ASSISTANT_STATE, (state) => {...})
     *   // Later: unsubscribe()
     */
    on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): Unsubscribe {
      // Type-safe event listener with automatic cleanup
      const handler = (_event: Electron.IpcRendererEvent, payload: EventMap[K]): void => {
        callback(payload)
      }

      ipcRenderer.on(event, handler)

      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener(event, handler)
      }
    },

    /**
     * Unsubscribe from assistant events
     * Note: Prefer using the unsubscribe function returned from .on()
     */
    off: (event: keyof EventMap, callback: (...args: unknown[]) => void): void => {
      ipcRenderer.removeListener(event, callback)
    }
  },

  audio: {
    /**
     * Start listening to audio input
     */
    startListening: async (): Promise<InvokeMap[typeof CHANNELS.invoke.AUDIO_START_LISTENING]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.AUDIO_START_LISTENING)
    },

    /**
     * Stop listening to audio input
     */
    stopListening: async (): Promise<InvokeMap[typeof CHANNELS.invoke.AUDIO_STOP_LISTENING]['res']> => {
      return await ipcRenderer.invoke(CHANNELS.invoke.AUDIO_STOP_LISTENING)
    },

    /**
     * Subscribe to audio events
     * Returns an unsubscribe function for cleanup
     *
     * Usage:
     *   const unsubscribe = window.api.audio.on(CHANNELS.events.AUDIO_STATE, (state) => {...})
     *   // Later: unsubscribe()
     */
    on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): Unsubscribe {
      // Type-safe event listener with automatic cleanup
      const handler = (_event: Electron.IpcRendererEvent, payload: EventMap[K]): void => {
        callback(payload)
      }

      ipcRenderer.on(event, handler)

      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener(event, handler)
      }
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
