/**
 * useRealtimeAgent Hook
 *
 * Manages WebRTC connection to OpenAI Realtime API
 * Handles audio streaming, data channel events, and transcription
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { BASE_URL, MODEL, createSessionUpdate } from '../lib/realtimeConfig'
import type {
  RealtimeEvent,
  RealtimeMessage,
  ResponseDoneEvent
} from '@shared/types/realtime'
import { getRealtimeClientSecret } from '../realtime/session'
import {
  closeRealtimeWebRtcConnection,
  createRealtimeWebRtcConnection,
  type RealtimeWebRtcConnection
} from '../realtime/webrtc'
import { attachRealtimeDataChannelHandlers } from '../realtime/events'

interface UseRealtimeAgentOptions {
  onUserTranscript?: (text: string, messageId: string) => void
  onBotTranscript?: (text: string, messageId: string) => void
  onTranscriptComplete?: (text: string, isUser: boolean, messageId: string) => void
  onError?: (error: Error) => void
}

interface UseRealtimeAgentReturn {
  isSessionStarted: boolean
  isSessionActive: boolean
  isListening: boolean
  messages: RealtimeMessage[]
  startSession: () => Promise<void>
  stopSession: () => void
  startRecording: () => Promise<void>
  stopRecording: () => void
  error: string | null
}

/**
 * Synchronization Issue: Speech and Transcription Models
 *
 * The speech model (gpt-4o-mini-realtime-preview) and transcription model
 * (gpt-4o-mini-transcribe) operate as separate services without shared session
 * identifiers. This creates race conditions and message ordering issues.
 *
 * Solution: Implement a completion state manager that tracks both model responses
 * and only advances the conversation cycle after receiving final events from both
 * services.
 */
export function useRealtimeAgent(
  options: UseRealtimeAgentOptions = {}
): UseRealtimeAgentReturn {
  const { onUserTranscript, onBotTranscript, onTranscriptComplete, onError } = options

  const [isSessionStarted, setIsSessionStarted] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const connRef = useRef<RealtimeWebRtcConnection | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const tracksRef = useRef<RTCRtpSender[]>([])
  const dcCleanupRef = useRef<(() => void) | null>(null)
  const placeholderTrackRef = useRef<MediaStreamTrack | null>(null)
  const placeholderAudioContextRef = useRef<AudioContext | null>(null)

  // Synchronization state management
  const currentMessageIdRef = useRef<string | null>(null)
  const completionStateRef = useRef({ responseDone: false, transcriptionDone: false })

  const resetMessageCycle = useCallback(() => {
    if (
      completionStateRef.current.responseDone &&
      completionStateRef.current.transcriptionDone
    ) {
      currentMessageIdRef.current = null
      completionStateRef.current = { responseDone: false, transcriptionDone: false }
    }
  }, [])

  const sendClientEvent = useCallback(
    (event: RealtimeEvent) => {
      const dc = connRef.current?.dc
      if (dc && dc.readyState === 'open') {
        event.event_id = event.event_id || crypto.randomUUID()
        dc.send(JSON.stringify(event))
      } else {
        console.error('[Realtime] Failed to send event - data channel not open', event)
      }
    },
    []
  )

  const startSession = useCallback(async () => {
    try {
      if (isSessionStarted) {
        console.log('[Realtime] Session already started')
        return
      }

      setError(null)

      const sessionToken = await getRealtimeClientSecret()

      console.log('[Realtime] Session token obtained, creating WebRTC connection')

      // Do NOT request microphone permissions here.
      // Start WebRTC with a placeholder silent track; we'll replace it on unmute.
      const { track: placeholderTrack, audioContext } = createSilentAudioTrack()
      placeholderTrackRef.current = placeholderTrack
      placeholderAudioContextRef.current = audioContext
      const placeholderStream = new MediaStream([placeholderTrack])

      const conn = await createRealtimeWebRtcConnection({
        sessionToken,
        baseUrl: BASE_URL,
        model: MODEL,
        initialStream: placeholderStream
      })

      connRef.current = conn
      tracksRef.current = conn.senders
      setIsSessionStarted(true)

      // Attach data channel listeners immediately (no ref/useEffect timing issues)
      dcCleanupRef.current?.()
      dcCleanupRef.current = attachRealtimeDataChannelHandlers(conn.dc, {
        onOpen: () => {
          console.log('[Realtime] Data channel opened')
          setIsSessionActive(true)
          setIsListening(false)

          const sessionUpdate = createSessionUpdate()
          sendClientEvent(sessionUpdate)
          console.log('[Realtime] Session update sent:', sessionUpdate)
        },
        onBotTranscriptDelta: (delta) => {
          if (!currentMessageIdRef.current) currentMessageIdRef.current = crypto.randomUUID()
          const messageId = currentMessageIdRef.current
          onBotTranscript?.(delta, messageId)

          setMessages((prev) => {
            const deltaIndex = prev.findIndex((msg) => msg.id === messageId)
            if (deltaIndex !== -1) {
              const updated = [...prev]
              updated[deltaIndex] = {
                ...updated[deltaIndex],
                bot: (updated[deltaIndex].bot || '') + delta
              }
              return updated
            }
            return [{ id: messageId, bot: delta }, ...prev]
          })
        },
        onUserTranscriptDelta: (delta) => {
          if (!currentMessageIdRef.current) currentMessageIdRef.current = crypto.randomUUID()
          const messageId = currentMessageIdRef.current
          onUserTranscript?.(delta, messageId)

          setMessages((prev) => {
            const deltaIndex = prev.findIndex((msg) => msg.id === messageId)
            if (deltaIndex !== -1) {
              const updated = [...prev]
              updated[deltaIndex] = {
                ...updated[deltaIndex],
                user: (updated[deltaIndex].user || '') + delta
              }
              return updated
            }
            return [{ id: messageId, user: delta }, ...prev]
          })
        },
        onUserTranscriptCompleted: (text) => {
          if (!currentMessageIdRef.current) return
          const messageId = currentMessageIdRef.current
          onTranscriptComplete?.(text, true, messageId)

          setMessages((prev) => {
            const idx = prev.findIndex((msg) => msg.id === messageId)
            if (idx === -1) return prev
            const updated = [...prev]
            updated[idx] = { ...updated[idx], user: text }
            return updated
          })

          completionStateRef.current.transcriptionDone = true
          if (completionStateRef.current.responseDone) resetMessageCycle()
        },
        onResponseDone: (doneEvent) => {
          const output = doneEvent.response?.output?.[0]
          if (output && output.type === 'message') {
            const finalTranscript = output.content?.[0]?.transcript
            if (finalTranscript && currentMessageIdRef.current) {
              const messageId = currentMessageIdRef.current
              onBotTranscript?.(finalTranscript, messageId)
              onTranscriptComplete?.(finalTranscript, false, messageId)

              setMessages((prev) => {
                const idx = prev.findIndex((msg) => msg.id === messageId)
                if (idx === -1) return prev
                const updated = [...prev]
                updated[idx] = {
                  ...updated[idx],
                  id: output.id || messageId,
                  bot: finalTranscript
                }
                return updated
              })
            }
          }

          completionStateRef.current.responseDone = true
          if (completionStateRef.current.transcriptionDone) resetMessageCycle()
        },
        onParseError: (err) => {
          console.error('[Realtime] Error handling message:', err)
        }
      })

      console.log('[Realtime] WebRTC connection established')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      console.error('[Realtime] Error starting session:', error)
      setError(error.message)
      onError?.(error)
      setIsSessionStarted(false)
    }
  }, [isSessionStarted, onError])

  const stopSession = useCallback(() => {
    console.log('[Realtime] Stopping session')

    dcCleanupRef.current?.()
    dcCleanupRef.current = null

    closeRealtimeWebRtcConnection(connRef.current)
    connRef.current = null

    // Stop real mic tracks (if any)
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }

    // Stop placeholder track + close its AudioContext
    if (placeholderTrackRef.current) {
      try {
        placeholderTrackRef.current.stop()
      } catch {
        // ignore
      }
      placeholderTrackRef.current = null
    }
    if (placeholderAudioContextRef.current) {
      void placeholderAudioContextRef.current.close().catch(() => undefined)
      placeholderAudioContextRef.current = null
    }

    setIsSessionStarted(false)
    setIsSessionActive(false)
    setIsListening(false)
    tracksRef.current = []
    currentMessageIdRef.current = null
    completionStateRef.current = { responseDone: false, transcriptionDone: false }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      if (!connRef.current) {
        throw new Error('Session not started')
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })
      audioStreamRef.current = newStream

      // Replace tracks if we have existing senders
      if (tracksRef.current.length > 0) {
        const micTrack = newStream.getAudioTracks()[0]
        tracksRef.current.forEach((sender) => {
          sender.replaceTrack(micTrack)
        })
      } else if (connRef.current) {
        // Fallback: add tracks if no senders exist
        newStream.getTracks().forEach((track) => {
          const sender = connRef.current?.pc.addTrack(track, newStream)
          if (sender) {
            tracksRef.current.push(sender)
          }
        })
      }

      setIsListening(true)
      console.log('[Realtime] Microphone started')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      console.error('[Realtime] Error accessing microphone:', error)
      setError(error.message)
      onError?.(error)
    }
  }, [onError])

  const stopRecording = useCallback(() => {
    setIsListening(false)

    // Stop existing mic tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }

    // Replace with placeholder (silent) track
    if (tracksRef.current.length > 0) {
      if (!placeholderTrackRef.current || placeholderTrackRef.current.readyState === 'ended') {
        const { track, audioContext } = createSilentAudioTrack()
        placeholderTrackRef.current = track
        placeholderAudioContextRef.current = audioContext
      }
      const placeholderTrack = placeholderTrackRef.current
      tracksRef.current.forEach((sender) => {
        sender.replaceTrack(placeholderTrack)
      })
    }

    console.log('[Realtime] Microphone stopped')
  }, [])

  function createSilentAudioTrack(): { track: MediaStreamTrack; audioContext: AudioContext } {
    // A silent track built from an AudioContext destination.
    // Caller must close the AudioContext (we do it in stopSession()).
    const audioContext = new AudioContext()
    const destination = audioContext.createMediaStreamDestination()
    return { track: destination.stream.getAudioTracks()[0], audioContext }
  }

  // Handle data channel messages
  useEffect(() => {
    return () => {
      // Ensure listeners don't leak if component unmounts mid-session.
      dcCleanupRef.current?.()
      dcCleanupRef.current = null
    }
  }, [])

  return {
    isSessionStarted,
    isSessionActive,
    isListening,
    messages,
    startSession,
    stopSession,
    startRecording,
    stopRecording,
    error
  }
}
