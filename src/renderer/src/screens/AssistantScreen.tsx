import React, { useState, useEffect, useRef } from 'react'
import { CHANNELS } from '@shared/ipc/channels'
import type { AssistantStatus, AssistantState, AssistantToken } from '@shared/types/assistant'
import type { AudioState, AudioLevel } from '@shared/types/audio'

/**
 * Assistant Screen - Tests assistant.sendMessage() and event subscriptions
 */
export default function AssistantScreen(): React.JSX.Element {
  const [message, setMessage] = useState<string>('')
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [tokens, setTokens] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageId, setMessageId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)

  // Refs for microphone resources (non-UI state)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)

  // Refs for MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number | null>(null)
  const recordingDurationIntervalRef = useRef<number | null>(null)
  const recordingMimeTypeRef = useRef<string | null>(null)

  // Refs for TTS
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Subscribe to assistant events
  useEffect(() => {
    let currentMessageId: string | null = null

    const unsubscribeState = window.api.assistant.on(
      CHANNELS.events.ASSISTANT_STATE,
      (state: AssistantState) => {
        setStatus(state.status)
        currentMessageId = state.messageId ?? null
        setMessageId(currentMessageId)
        if (state.error) {
          setError(state.error.message)
        }
      }
    )

    const unsubscribeToken = window.api.assistant.on(
      CHANNELS.events.ASSISTANT_TOKEN,
      (token: AssistantToken) => {
        setTokens((prev) => {
          // Only append tokens for the current message
          if (token.messageId === currentMessageId || !currentMessageId) {
            return [...prev, token.token]
          }
          return prev
        })
      }
    )

    // Cleanup on unmount
    return () => {
      unsubscribeState()
      unsubscribeToken()
    }
  }, []) // Only subscribe once on mount

  // Subscribe to audio events
  useEffect(() => {
    const unsubscribeState = window.api.audio.on(
      CHANNELS.events.AUDIO_STATE,
      (state: AudioState) => {
        setIsListening(state.isListening)
      }
    )

    const unsubscribeLevel = window.api.audio.on(
      CHANNELS.events.AUDIO_LEVEL,
      (level: AudioLevel) => {
        // Only use IPC levels if real mic is not active
        if (!analyserRef.current) {
          setAudioLevel(level.level)
        }
      }
    )

    // Cleanup on unmount
    return () => {
      unsubscribeState()
      unsubscribeLevel()
    }
  }, [])

  /**
   * Cleanup microphone resources
   */
  const cleanupMic = async (): Promise<void> => {
    // Cancel animation frame
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }

    // Stop all MediaStream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      mediaStreamRef.current = null
    }

    // Disconnect audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    // Close AudioContext
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close()
      } catch {
        // Ignore errors when closing context
      }
      audioContextRef.current = null
    }

    // Reset audio level
    setAudioLevel(0)
  }

  // Microphone capture: setup/teardown based on isListening state
  useEffect(() => {
    if (!isListening) {
      // Cleanup when stopping
      cleanupMic().catch(() => {
        // Ignore cleanup errors
      })
      return
    }

    // Setup microphone when starting
    let mounted = true

    const setupMicrophone = async (): Promise<void> => {
      try {
        setMicError(null)

        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!mounted) {
          // Component unmounted during async operation
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        mediaStreamRef.current = stream

        // Create AudioContext (handle browser prefixes)
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const audioContext = new AudioContextClass()
        audioContextRef.current = audioContext

        // Create source node from MediaStream
        const source = audioContext.createMediaStreamSource(stream)
        sourceRef.current = source

        // Create analyser node
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0.8
        analyserRef.current = analyser

        // Connect source -> analyser
        source.connect(analyser)

        // Start level computation loop
        const bufferLength = analyser.fftSize
        const dataArray = new Uint8Array(bufferLength)

        const updateLevel = (): void => {
          if (!mounted || !isListening || !analyserRef.current) {
            return
          }

          // Get time-domain data (better for volume meters)
          analyserRef.current.getByteTimeDomainData(dataArray)

          // Compute RMS
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            const v = (dataArray[i] - 128) / 128 // Normalize to -1..1
            sum += v * v
          }
          const rms = Math.sqrt(sum / bufferLength)
          const level = Math.min(1, Math.max(0, rms)) // Clamp to 0..1

          setAudioLevel(level)

          animationFrameIdRef.current = requestAnimationFrame(updateLevel)
        }

        animationFrameIdRef.current = requestAnimationFrame(updateLevel)
      } catch (err) {
        if (!mounted) return

        // Handle errors with user-friendly messages
        let errorMessage = 'Failed to access microphone'
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage =
              'Microphone permission denied. Please allow microphone access in your browser settings.'
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone device.'
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage = 'Microphone is already in use by another application.'
          } else if (
            err.name === 'OverconstrainedError' ||
            err.name === 'ConstraintNotSatisfiedError'
          ) {
            errorMessage = 'Microphone constraints could not be satisfied.'
          } else {
            errorMessage = `Failed to access microphone: ${err.message}`
          }
        }

        setMicError(errorMessage)

        // Re-sync state with main process by calling stopListening
        await window.api.audio.stopListening().catch(() => {
          // Ignore errors during cleanup
        })

        // Defensive cleanup in case partial setup happened
        await cleanupMic().catch(() => {
          // Ignore cleanup errors
        })
      }
    }

    setupMicrophone()

    return () => {
      mounted = false
      cleanupMic().catch(() => {
        // Ignore cleanup errors
      })
    }
  }, [isListening])

  // Start recording when stream becomes available and listening is active
  useEffect(() => {
    if (isListening && mediaStreamRef.current && !isRecording) {
      // Reset chunks
      recordedChunksRef.current = []

      // Determine best mime type
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '' // Use default
        }
      }

      try {
        // Create MediaRecorder
        const recorder = new MediaRecorder(
          mediaStreamRef.current,
          mimeType ? { mimeType } : undefined
        )
        mediaRecorderRef.current = recorder

        // Store mimeType (MediaRecorder.mimeType can be empty in some builds)
        recordingMimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm'

        // Handle data available
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        // Start recording
        recorder.start()
        setIsRecording(true)
        recordingStartTimeRef.current = Date.now()
        setRecordingDuration(0)

        // Start duration interval
        recordingDurationIntervalRef.current = window.setInterval(() => {
          if (recordingStartTimeRef.current) {
            const duration = (Date.now() - recordingStartTimeRef.current) / 1000
            setRecordingDuration(duration)
          }
        }, 100)
      } catch (err) {
        setMicError(err instanceof Error ? err.message : 'Failed to start recording')
      }
    }
    // Defensive: stop recording if listening stops unexpectedly
    if (!isListening && isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      if (recordingDurationIntervalRef.current !== null) {
        clearInterval(recordingDurationIntervalRef.current)
        recordingDurationIntervalRef.current = null
      }
      recordedChunksRef.current = []
      recordingStartTimeRef.current = null
      setIsRecording(false)
      setRecordingDuration(0)
    }
  }, [isListening, isRecording])

  // Subscribe to TTS events
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not available')
      return
    }

    const handleSpeak = (payload: {
      text: string
      voice?: string
      rate?: number
      pitch?: number
      volume?: number
    }): void => {
      // Cancel current speech first
      window.speechSynthesis.cancel()
      currentUtteranceRef.current = null

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(payload.text)

      // Apply optional properties
      if (payload.rate !== undefined) {
        utterance.rate = payload.rate
      }
      if (payload.pitch !== undefined) {
        utterance.pitch = payload.pitch
      }
      if (payload.volume !== undefined) {
        utterance.volume = payload.volume
      }

      // Voice selection with delayed loading support
      const setVoice = (): void => {
        if (payload.voice) {
          const voices = window.speechSynthesis.getVoices()
          const selectedVoice = voices.find((v) => v.name === payload.voice)
          if (selectedVoice) {
            utterance.voice = selectedVoice
          }
        }
      }

      // Try to set voice immediately
      setVoice()

      // If voices not loaded yet, wait for voiceschanged event (one-time)
      if (window.speechSynthesis.getVoices().length === 0) {
        const onVoicesChanged = (): void => {
          setVoice()
          window.speechSynthesis.speak(utterance)
          currentUtteranceRef.current = utterance
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        }
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
      } else {
        // Speak immediately
        window.speechSynthesis.speak(utterance)
        currentUtteranceRef.current = utterance
      }
    }

    const handleStop = (): void => {
      window.speechSynthesis.cancel()
      currentUtteranceRef.current = null
    }

    // Subscribe to TTS events
    const unsubscribeSpeak = window.api.tts.on(CHANNELS.events.TTS_SPEAK, handleSpeak)
    const unsubscribeStop = window.api.tts.on(CHANNELS.events.TTS_STOP, handleStop)

    // Cleanup on unmount
    return () => {
      unsubscribeSpeak()
      unsubscribeStop()
      // Cancel speech
      window.speechSynthesis.cancel()
      currentUtteranceRef.current = null
    }
  }, [])

  // Ensure stopListening is called on unmount
  useEffect(() => {
    return () => {
      // Stop MediaRecorder if active
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }

      // Clear recording interval
      if (recordingDurationIntervalRef.current !== null) {
        clearInterval(recordingDurationIntervalRef.current)
        recordingDurationIntervalRef.current = null
      }

      // Clear chunks
      recordedChunksRef.current = []

      // Always call stopListening on unmount (idempotent)
      window.api.audio.stopListening().catch(() => {
        // Ignore errors during cleanup
      })
      // Cleanup microphone resources
      cleanupMic().catch(() => {
        // Ignore cleanup errors
      })
    }
  }, [isRecording])

  const handleSend = async (): Promise<void> => {
    if (!message.trim()) return

    setLoading(true)
    setError(null)
    setTokens([]) // Clear previous tokens
    setStatus(null)

    try {
      const response = await window.api.assistant.sendMessage(message)
      setMessageId(response.messageId)
      setMessage('') // Clear input
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !loading) {
      handleSend()
    }
  }

  /**
   * Generate fallback transcript based on duration (local mock)
   */
  const generateFallbackTranscript = (durationMs: number): string => {
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
   * Stop recording and generate transcript via STT IPC
   */
  const stopRecordingAndGenerateTranscript = async (): Promise<string> => {
    if (!isRecording || !mediaRecorderRef.current) {
      return generateFallbackTranscript(0)
    }

    // Stop duration interval
    if (recordingDurationIntervalRef.current !== null) {
      clearInterval(recordingDurationIntervalRef.current)
      recordingDurationIntervalRef.current = null
    }

    // Stop recorder and wait for final data
    return new Promise<string>((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder) {
        resolve(generateFallbackTranscript(0))
        return
      }

      recorder.onstop = async () => {
        try {
          // Guard empty chunks
          if (recordedChunksRef.current.length === 0) {
            const durationMs = recordingStartTimeRef.current
              ? Math.max(0, Math.round(Date.now() - recordingStartTimeRef.current))
              : Math.round(recordingDuration * 1000)
            resolve(generateFallbackTranscript(durationMs))
            return
          }

          // Determine mimeType safely
          const mimeType = recordingMimeTypeRef.current || 'audio/webm'

          // Assemble Blob from chunks
          const blob = new Blob(recordedChunksRef.current, { type: mimeType })

          // Convert Blob to base64 using FileReader
          const base64 = await new Promise<string>((resolveBase64, rejectBase64) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const result = typeof reader.result === 'string' ? reader.result : ''
              const b64 = result.includes(',') ? result.split(',')[1] : result
              resolveBase64(b64 || '')
            }
            reader.onerror = () => rejectBase64(reader.error || new Error('FileReader error'))
            reader.readAsDataURL(blob)
          })

          // Calculate durationMs (prefer timestamp delta)
          const durationMs = recordingStartTimeRef.current
            ? Math.max(0, Math.round(Date.now() - recordingStartTimeRef.current))
            : Math.round(recordingDuration * 1000)

          // Guard empty base64
          if (!base64) {
            resolve(generateFallbackTranscript(durationMs))
            return
          }

          // Call STT IPC
          const res = await window.api.stt.transcribe({
            audioBase64: base64,
            mimeType,
            durationMs
          })

          // Clear chunks
          recordedChunksRef.current = []
          recordingStartTimeRef.current = null
          setIsRecording(false)
          setRecordingDuration(0)

          resolve(res.text)
        } catch (err) {
          // Fallback to local mock transcript on any error
          console.error('STT transcription error:', err)
          const durationMs = recordingStartTimeRef.current
            ? Math.max(0, Math.round(Date.now() - recordingStartTimeRef.current))
            : Math.round(recordingDuration * 1000)

          // Clear chunks
          recordedChunksRef.current = []
          recordingStartTimeRef.current = null
          setIsRecording(false)
          setRecordingDuration(0)

          resolve(generateFallbackTranscript(durationMs))
        }
      }

      recorder.stop()
    })
  }

  /**
   * Tap button handler - tap-to-interact model
   */
  const handleTapButton = async (): Promise<void> => {
    try {
      if (isListening) {
        // Stop listening → stop recording → generate transcript → send
        await window.api.audio.stopListening()
        const transcript = await stopRecordingAndGenerateTranscript()
        setLastTranscript(transcript)
        await window.api.assistant.sendMessage(transcript)
        return
      }

      if (status === 'thinking' || status === 'responding') {
        // Interrupt assistant
        await window.api.assistant.cancel()
        setTokens([]) // Clear tokens
        return
      }

      // Idle → start listening (recording will start when stream is available)
      await window.api.audio.startListening()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to handle tap')
    }
  }

  /**
   * Get button label based on current state
   */
  const getButtonLabel = (): string => {
    if (isListening) {
      return `Listening… (tap to stop) ${recordingDuration > 0 ? `(${recordingDuration.toFixed(1)}s)` : ''}`
    }
    if (status === 'thinking' || status === 'responding') {
      return 'Tap to interrupt'
    }
    return 'Tap to speak'
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Assistant</h2>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}
      {micError && (
        <div style={{ color: 'red', marginBottom: '10px' }}>Microphone Error: {micError}</div>
      )}

      {/* Voice Control UI */}
      <div
        style={{
          marginBottom: '20px',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Voice Control</h3>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={handleTapButton} style={{ marginRight: '10px', padding: '10px 20px' }}>
            {getButtonLabel()}
          </button>
          {isRecording && <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Recording…</span>}
        </div>
        {lastTranscript && (
          <div style={{ marginBottom: '10px', fontStyle: 'italic', color: '#666' }}>
            <strong>Last heard:</strong> {lastTranscript}
          </div>
        )}
        <div>
          <strong>Level:</strong>
          <div
            style={{
              width: '200px',
              height: '20px',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              marginTop: '5px',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: `${audioLevel * 100}%`,
                height: '100%',
                backgroundColor: isListening ? '#4caf50' : '#ccc',
                transition: 'width 0.05s ease-out'
              }}
            />
          </div>
          <span style={{ fontSize: '12px' }}>{(audioLevel * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={loading}
          style={{ width: '300px', padding: '5px', marginRight: '10px' }}
        />
        <button onClick={handleSend} disabled={loading || !message.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div>
          <strong>Status:</strong> {status ?? 'idle'}
        </div>
        {messageId && (
          <div>
            <strong>Message ID:</strong> {messageId}
          </div>
        )}
      </div>

      <div>
        <h3>Response:</h3>
        <div
          style={{
            border: '1px solid #ccc',
            padding: '10px',
            minHeight: '100px',
            backgroundColor: '#f9f9f9',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
        >
          {tokens.length > 0 ? tokens.join('') : '(No response yet)'}
        </div>
      </div>
    </div>
  )
}
