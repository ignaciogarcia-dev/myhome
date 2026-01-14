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
  TranscriptionDeltaEvent,
  TranscriptionCompletedEvent,
  ResponseDoneEvent
} from '@shared/types/realtime'

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

  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const tracksRef = useRef<RTCRtpSender[]>([])

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
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        event.event_id = event.event_id || crypto.randomUUID()
        dataChannelRef.current.send(JSON.stringify(event))
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

      // Get ephemeral token via IPC
      const session = await window.api.realtime.getSession({})
      const sessionToken = session.clientSecret

      if (!sessionToken) {
        throw new Error('Failed to get session token')
      }

      console.log('[Realtime] Session token obtained, creating WebRTC connection')

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection()

      // Setup audio element for playback
      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement('audio')
        audioElementRef.current.autoplay = true
      }

      pc.ontrack = (e) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = e.streams[0]
        }
      }

      // Get user media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream)
        if (sender) {
          tracksRef.current.push(sender)
        }
      })

      audioStreamRef.current = stream

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc

      // Setup SDP exchange
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpResponse = await fetch(`${BASE_URL}?model=${MODEL}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/sdp'
        }
      })

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.status} ${sdpResponse.statusText}`)
      }

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpResponse.text()
      }
      await pc.setRemoteDescription(answer)

      peerConnectionRef.current = pc
      setIsSessionStarted(true)

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

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
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
      if (!peerConnectionRef.current) {
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
      } else if (peerConnectionRef.current) {
        // Fallback: add tracks if no senders exist
        newStream.getTracks().forEach((track) => {
          const sender = peerConnectionRef.current?.addTrack(track, newStream)
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
      const placeholderTrack = createEmptyAudioTrack()
      tracksRef.current.forEach((sender) => {
        sender.replaceTrack(placeholderTrack)
      })
    }

    console.log('[Realtime] Microphone stopped')
  }, [])

  // Create empty audio track for placeholder
  function createEmptyAudioTrack(): MediaStreamTrack {
    const audioContext = new AudioContext()
    const destination = audioContext.createMediaStreamDestination()
    return destination.stream.getAudioTracks()[0]
  }

  // Handle data channel messages
  useEffect(() => {
    const dc = dataChannelRef.current
    if (!dc) return

    const handleMessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as
          | TranscriptionDeltaEvent
          | TranscriptionCompletedEvent
          | ResponseDoneEvent
          | { type: string; [key: string]: unknown }

        // Generate message ID for new conversations
        if (
          (event.type === 'response.audio_transcript.delta' ||
            event.type === 'conversation.item.input_audio_transcription.delta') &&
          !currentMessageIdRef.current
        ) {
          currentMessageIdRef.current = crypto.randomUUID()
        }

        switch (event.type) {
          case 'response.audio_transcript.delta': {
            const deltaEvent = event as TranscriptionDeltaEvent
            if (deltaEvent.delta && currentMessageIdRef.current) {
              const messageId = currentMessageIdRef.current
              onBotTranscript?.(deltaEvent.delta, messageId)

              setMessages((prev) => {
                const deltaIndex = prev.findIndex((msg) => msg.id === messageId)
                if (deltaIndex !== -1) {
                  const updated = [...prev]
                  updated[deltaIndex] = {
                    ...updated[deltaIndex],
                    bot: (updated[deltaIndex].bot || '') + deltaEvent.delta
                  }
                  return updated
                }
                return [
                  {
                    id: messageId,
                    bot: deltaEvent.delta
                  },
                  ...prev
                ]
              })
            }
            break
          }

          case 'conversation.item.input_audio_transcription.delta': {
            const deltaEvent = event as TranscriptionDeltaEvent
            if (deltaEvent.delta && currentMessageIdRef.current) {
              const messageId = currentMessageIdRef.current
              onUserTranscript?.(deltaEvent.delta, messageId)

              setMessages((prev) => {
                const deltaIndex = prev.findIndex((msg) => msg.id === messageId)
                if (deltaIndex !== -1) {
                  const updated = [...prev]
                  updated[deltaIndex] = {
                    ...updated[deltaIndex],
                    user: (updated[deltaIndex].user || '') + deltaEvent.delta
                  }
                  return updated
                }
                return [
                  {
                    id: messageId,
                    user: deltaEvent.delta
                  },
                  ...prev
                ]
              })
            }
            break
          }

          case 'conversation.item.input_audio_transcription.completed': {
            const completedEvent = event as TranscriptionCompletedEvent
            if (completedEvent.transcript && currentMessageIdRef.current) {
              const messageId = currentMessageIdRef.current
              onTranscriptComplete?.(completedEvent.transcript, true, messageId)

              setMessages((prev) => {
                const deltaIndex = prev.findIndex((msg) => msg.id === messageId)
                if (deltaIndex !== -1) {
                  const updated = [...prev]
                  updated[deltaIndex] = {
                    ...updated[deltaIndex],
                    user: completedEvent.transcript
                  }
                  return updated
                }
                return prev
              })

              completionStateRef.current.transcriptionDone = true
              if (completionStateRef.current.responseDone) {
                resetMessageCycle()
              }
            }
            break
          }

          case 'response.done': {
            const doneEvent = event as ResponseDoneEvent
            const output = doneEvent.response?.output?.[0]
            if (output && output.type === 'message') {
              const finalTranscript = output.content?.[0]?.transcript
              if (finalTranscript && currentMessageIdRef.current) {
                const messageId = currentMessageIdRef.current
                onBotTranscript?.(finalTranscript, messageId)
                onTranscriptComplete?.(finalTranscript, false, messageId)

                setMessages((prev) => {
                  const deltaIndex = prev.findIndex((msg) => msg.id === messageId)
                  if (deltaIndex !== -1) {
                    const updated = [...prev]
                    updated[deltaIndex] = {
                      ...updated[deltaIndex],
                      id: output.id || messageId,
                      bot: finalTranscript
                    }
                    return updated
                  }
                  return prev
                })
              }
            }

            completionStateRef.current.responseDone = true
            if (completionStateRef.current.transcriptionDone) {
              resetMessageCycle()
            }
            break
          }

          default:
            // Ignore other event types
            break
        }
      } catch (err) {
        console.error('[Realtime] Error handling message:', err)
      }
    }

    const handleOpen = () => {
      console.log('[Realtime] Data channel opened')
      setIsSessionActive(true)
      setIsListening(true)

      // Send session update with transcription config
      const sessionUpdate = createSessionUpdate()
      sendClientEvent(sessionUpdate)
      console.log('[Realtime] Session update sent:', sessionUpdate)
    }

    dc.addEventListener('message', handleMessage)
    dc.addEventListener('open', handleOpen)

    return () => {
      dc.removeEventListener('message', handleMessage)
      dc.removeEventListener('open', handleOpen)
    }
  }, [sendClientEvent, onUserTranscript, onBotTranscript, onTranscriptComplete, resetMessageCycle])

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
