/**
 * Realtime API Types
 *
 * Types for OpenAI Realtime API events and messages
 * Based on realtime-voice-agent implementation
 */

export type ToolCallOutput = {
  response: string
  [key: string]: unknown
}

export interface RealtimeMessage {
  id: string
  bot?: string
  user?: string
}

export interface ToolCallType {
  name: string
  arguments: string
}

type AssistantContent = {
  type: 'audio'
  transcript: string
}

export type AssistantMessage = {
  id: string
  object: 'realtime.item'
  type: 'message'
  status: 'completed'
  role: 'assistant'
  content: AssistantContent[]
}

type FunctionCallMessage = {
  id: string
  object: 'realtime.item'
  type: 'function_call'
  status: 'completed'
  name: string
  call_id: string
  arguments: string
}

export type ResponseDoneOutputType = AssistantMessage | FunctionCallMessage

// --- Shared Nested Types ---
type AudioTranscription = {
  model?: string
}

type TurnDetection = {
  type?: 'server_vad'
  threshold?: number
  prefix_padding_ms?: number
  silence_duration_ms?: number
  create_response?: boolean
}

type ToolParameter = {
  type?: string
  properties?: Record<string, { type: string }>
  required?: string[]
}

type Tool = {
  type?: 'function'
  name?: string
  description?: string
  parameters?: ToolParameter
}

type Session = {
  modalities?: ('text' | 'audio')[]
  instructions?: string
  voice?: string
  input_audio_format?: string
  output_audio_format?: string
  input_audio_transcription?: AudioTranscription
  turn_detection?: TurnDetection
  tools?: Tool[]
  tool_choice?: 'auto' | string
  temperature?: number
  max_response_output_tokens?: string | number
  speed?: number
  tracing?: string
}

type Response = {
  modalities?: ('text' | 'audio')[]
  instructions?: string
  voice?: string
  output_audio_format?: string
  tools?: Tool[]
  tool_choice?: 'auto' | string
  temperature?: number
  max_output_tokens?: number
}

// --- Message Item ---
type MessageContent = { type: 'input_text'; text?: string } | { type: 'input_audio'; audio_url?: string }

type Item = {
  id?: string
  arguments?: string
  call_id?: string
  type?: 'message' | 'function_call' | 'function_call_output'
  role?: 'user' | 'assistant' | 'system'
  content?: MessageContent[]
  output?: string
}

// --- Event Types ---
export type SessionUpdateEvent = {
  type: 'session.update'
  event_id?: string
  session?: Partial<Session>
}

export type ConversationItemCreateEvent = {
  type: 'conversation.item.create'
  event_id?: string
  previous_item_id?: string | null
  item?: Partial<Item>
}

export type ResponseCreateEvent = {
  type: 'response.create'
  event_id?: string
  response?: Partial<Response>
}

export type RealtimeEvent = SessionUpdateEvent | ConversationItemCreateEvent | ResponseCreateEvent

// --- Realtime API Event Types (from data channel) ---
export interface RealtimeDataChannelEvent {
  type: string
  event_id?: string
  [key: string]: unknown
}

export interface TranscriptionDeltaEvent extends RealtimeDataChannelEvent {
  type: 'conversation.item.input_audio_transcription.delta' | 'response.audio_transcript.delta'
  delta?: string
  item_id?: string
  response_id?: string
}

export interface TranscriptionCompletedEvent extends RealtimeDataChannelEvent {
  type: 'conversation.item.input_audio_transcription.completed'
  transcript?: string
  item_id?: string
}

export interface ResponseDoneEvent extends RealtimeDataChannelEvent {
  type: 'response.done'
  response?: {
    output?: ResponseDoneOutputType[]
    [key: string]: unknown
  }
}
