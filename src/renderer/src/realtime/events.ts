import type {
  RealtimeDataChannelEvent,
  ResponseDoneEvent,
  TranscriptionCompletedEvent,
  TranscriptionDeltaEvent
} from '@shared/types/realtime'

export type RealtimeEventHandlers = {
  onOpen?: () => void
  onMessage?: (raw: RealtimeDataChannelEvent) => void
  onBotTranscriptDelta?: (delta: string) => void
  onUserTranscriptDelta?: (delta: string) => void
  onUserTranscriptCompleted?: (text: string) => void
  onResponseDone?: (event: ResponseDoneEvent) => void
  onParseError?: (err: unknown) => void
}

/**
 * Attach listeners to a data channel and parse OpenAI Realtime events.
 * Returns a cleanup function.
 */
export function attachRealtimeDataChannelHandlers(
  dc: RTCDataChannel,
  handlers: RealtimeEventHandlers
): () => void {
  const handleOpen = () => handlers.onOpen?.()

  const handleMessage = (e: MessageEvent) => {
    try {
      const event = JSON.parse(e.data) as RealtimeDataChannelEvent
      handlers.onMessage?.(event)

      switch (event.type) {
        case 'response.audio_transcript.delta': {
          const deltaEvent = event as TranscriptionDeltaEvent
          if (deltaEvent.delta) handlers.onBotTranscriptDelta?.(deltaEvent.delta)
          break
        }
        case 'conversation.item.input_audio_transcription.delta': {
          const deltaEvent = event as TranscriptionDeltaEvent
          if (deltaEvent.delta) handlers.onUserTranscriptDelta?.(deltaEvent.delta)
          break
        }
        case 'conversation.item.input_audio_transcription.completed': {
          const completedEvent = event as TranscriptionCompletedEvent
          if (completedEvent.transcript) handlers.onUserTranscriptCompleted?.(completedEvent.transcript)
          break
        }
        case 'response.done': {
          handlers.onResponseDone?.(event as ResponseDoneEvent)
          break
        }
        default:
          break
      }
    } catch (err) {
      handlers.onParseError?.(err)
    }
  }

  dc.addEventListener('open', handleOpen)
  dc.addEventListener('message', handleMessage)

  return () => {
    dc.removeEventListener('open', handleOpen)
    dc.removeEventListener('message', handleMessage)
  }
}

