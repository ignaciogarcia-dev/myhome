/**
 * STT IPC Handlers
 *
 * Handles speech-to-text transcription requests.
 * Supports multiple providers (mock, OpenAI) via provider interface.
 */

import { ipcMain } from 'electron'
import { CHANNELS, type InvokeMap } from '../../shared'
import { getCurrentSettings } from './settings'
import { getOpenAIKey } from './secrets'

/**
 * STT Provider ID type
 */
type SttProviderId = 'mock' | 'openai'

/**
 * STT Provider interface
 */
interface SttProvider {
  id: SttProviderId
  transcribe(input: {
    audioBase64: string
    mimeType: string
    durationMs: number
    model: string
    language?: string
  }): Promise<{ text: string; provider: SttProviderId; confidence?: number }>
}

/**
 * MIME type to file extension mapping
 */
function extFromMime(mimeType: string): string {
  const m = mimeType.toLowerCase()
  const map: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/x-wav': '.wav',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/ogg': '.ogg',
    'audio/opus': '.opus'
  }
  return map[m] || '.webm'
}

/**
 * Generate fallback transcript (same mapping as MockSttProvider)
 */
function generateFallbackTranscript(durationMs: number): string {
  if (durationMs < 1000) {
    return 'Tell me a joke'
  }
  if (durationMs >= 1000 && durationMs < 3000) {
    return 'Hello, how can I help you?'
  }
  if (durationMs >= 3000 && durationMs < 5000) {
    return "What's the weather like today?"
  }
  return `User said something (${(durationMs / 1000).toFixed(1)}s)`
}

/**
 * Mock STT Provider
 * Generates transcripts based on duration (mock-first implementation)
 */
class MockSttProvider implements SttProvider {
  id: 'mock' = 'mock'

  async transcribe(input: {
    audioBase64: string
    mimeType: string
    durationMs: number
    model: string
    language?: string
  }): Promise<{ text: string; provider: 'mock'; confidence?: number }> {
    // Ignore audioBase64, mimeType, model, and language for mock
    const { durationMs } = input

    const text = generateFallbackTranscript(durationMs)

    return {
      text,
      provider: 'mock'
    }
  }
}

/**
 * OpenAI STT Provider
 * Uses OpenAI audio transcription API
 */
class OpenAISttProvider implements SttProvider {
  id: 'openai' = 'openai'

  constructor(private getApiKey: () => Promise<string | null>) {}

  async transcribe(input: {
    audioBase64: string
    mimeType: string
    durationMs: number
    model: string
    language?: string
  }): Promise<{ text: string; provider: 'openai' | 'mock'; confidence?: number }> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      // Fallback to mock if no API key
      return {
        text: generateFallbackTranscript(input.durationMs),
        provider: 'mock'
      }
    }

    try {
      // Decode base64 to Buffer
      const audioBuffer = Buffer.from(input.audioBase64, 'base64')
      const fileName = `audio${extFromMime(input.mimeType)}`

      // Create FormData with File from Buffer
      const form = new FormData()
      const file = new File([audioBuffer], fileName, { type: input.mimeType })

      form.append('file', file)
      form.append('model', input.model || 'gpt-4o-mini-transcribe')

      // Optional language hint (ISO 639-1)
      if (input.language && /^[a-z]{2}$/i.test(input.language)) {
        form.append('language', input.language.toLowerCase())
      }

      // Call OpenAI API
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: form
      })

      if (!res.ok) {
        throw new Error(`OpenAI STT failed: ${res.status} ${res.statusText}`)
      }

      const json = (await res.json()) as { text?: string }

      return {
        text: json.text ?? '',
        provider: 'openai'
      }
    } catch (err) {
      console.error('OpenAI STT error:', err)
      // Fallback to mock transcript
      return {
        text: generateFallbackTranscript(input.durationMs),
        provider: 'mock'
      }
    }
  }
}

// Create provider instances
const mockProvider = new MockSttProvider()
const openaiProvider = new OpenAISttProvider(getOpenAIKey)

/**
 * Get provider based on settings
 */
async function getSttProvider(): Promise<SttProvider> {
  const settings = getCurrentSettings()
  if (settings.sttProvider === 'openai') {
    // Check if API key exists
    const hasKey = await getOpenAIKey()
    if (hasKey) {
      return openaiProvider
    }
    // Fallback to mock if no key
    console.warn('OpenAI provider selected but no API key found. Falling back to mock.')
    return mockProvider
  }
  return mockProvider
}

/**
 * Register STT IPC handlers
 */
export function registerSttHandlers(): void {
  // Handle transcribe request
  ipcMain.handle(
    CHANNELS.invoke.STT_TRANSCRIBE,
    async (
      _event,
      request: InvokeMap[typeof CHANNELS.invoke.STT_TRANSCRIBE]['req']
    ): Promise<InvokeMap[typeof CHANNELS.invoke.STT_TRANSCRIBE]['res']> => {
      try {
        // Light validation
        if (request.durationMs <= 0 || !request.audioBase64) {
          // Return fallback transcript
          return {
            text: generateFallbackTranscript(request.durationMs || 0),
            provider: 'mock'
          }
        }

        // Get provider based on settings
        const provider = await getSttProvider()
        const settings = getCurrentSettings()

        // Call provider with model and language from settings
        const result = await provider.transcribe({
          audioBase64: request.audioBase64,
          mimeType: request.mimeType,
          durationMs: request.durationMs,
          model: settings.sttModel || 'gpt-4o-mini-transcribe',
          language: settings.language !== 'en' ? settings.language : undefined
        })

        return result
      } catch (err) {
        // Log error but return fallback transcript
        console.error('STT transcription error:', err)
        return {
          text: generateFallbackTranscript(request.durationMs || 0),
          provider: 'mock'
        }
      }
    }
  )
}
