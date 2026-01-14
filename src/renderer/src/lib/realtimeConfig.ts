/**
 * Realtime API Configuration
 *
 * Configuration constants and session setup for OpenAI Realtime API
 * Based on realtime-voice-agent implementation
 */

export const MODEL = 'gpt-4o-mini-realtime-preview'
export const BASE_URL = 'https://api.openai.com/v1/realtime'

export const INSTRUCTIONS = `
You are a helpful AI assistant. Respond naturally and conversationally.
`

/**
 * Create session update configuration
 */
export function createSessionUpdate() {
  return {
    type: 'session.update' as const,
    session: {
      instructions: INSTRUCTIONS,
      input_audio_transcription: {
        model: 'gpt-4o-mini-transcribe'
      },
      max_response_output_tokens: 300
    }
  }
}
