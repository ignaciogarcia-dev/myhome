/**
 * Realtime API Configuration
 *
 * Configuration constants and session setup for OpenAI Realtime API
 * Based on realtime-voice-agent implementation
 */

export const MODEL = 'gpt-4o-mini-realtime-preview'
export const BASE_URL = 'https://api.openai.com/v1/realtime'

// Tools definition (can be extended later)
export const toolsDefinition = [
  {
    name: 'navigate',
    description: 'Navigate to a specific page in the app',
    parameters: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['/', '/about'],
          description: 'Page path to navigate to'
        }
      },
      required: ['page']
    }
  }
]

export const TOOLS = toolsDefinition.map((tool) => ({
  type: 'function' as const,
  ...tool
}))

export const INSTRUCTIONS = `
You are a helpful AI assistant. Respond naturally and conversationally.
When the user asks to navigate to a page, use the navigate tool.
Otherwise, answer their questions normally.
`

/**
 * Create session update configuration
 */
export function createSessionUpdate() {
  return {
    type: 'session.update' as const,
    session: {
      tools: TOOLS,
      instructions: INSTRUCTIONS,
      input_audio_transcription: {
        model: 'gpt-4o-mini-transcribe'
      },
      max_response_output_tokens: 300
    }
  }
}
