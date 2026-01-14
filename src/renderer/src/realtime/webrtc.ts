/**
 * WebRTC helpers for OpenAI Realtime API (renderer-only).
 *
 * Responsibilities:
 * - Create RTCPeerConnection + RTCDataChannel
 * - Do SDP exchange against /v1/realtime
 * - Wire pc.ontrack for audio playback
 */

export type RealtimeWebRtcConnection = {
  pc: RTCPeerConnection
  dc: RTCDataChannel
  /**
   * Audio element used for playback of the remote audio track.
   * Caller owns insertion into DOM if desired.
   */
  audioEl: HTMLAudioElement
  /**
   * Senders returned from pc.addTrack (if any were added).
   * Useful for replaceTrack() lifecycle.
   */
  senders: RTCRtpSender[]
}

export async function createRealtimeWebRtcConnection(params: {
  sessionToken: string
  baseUrl: string
  model: string
  /**
   * Optional stream to attach immediately (current implementation uses mic here).
   * Later lifecycle refactor can pass a placeholder track or omit.
   */
  initialStream?: MediaStream
}): Promise<RealtimeWebRtcConnection> {
  const { sessionToken, baseUrl, model, initialStream } = params

  const pc = new RTCPeerConnection()
  const audioEl = document.createElement('audio')
  audioEl.autoplay = true

  pc.ontrack = (e) => {
    // Realtime sends a single remote audio stream
    audioEl.srcObject = e.streams[0]
  }

  const senders: RTCRtpSender[] = []
  if (initialStream) {
    initialStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, initialStream)
      if (sender) senders.push(sender)
    })
  }

  const dc = pc.createDataChannel('oai-events')

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
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

  return { pc, dc, audioEl, senders }
}

export function closeRealtimeWebRtcConnection(conn: RealtimeWebRtcConnection | null): void {
  if (!conn) return
  try {
    conn.dc.close()
  } catch {
    // ignore
  }
  try {
    conn.pc.close()
  } catch {
    // ignore
  }
  try {
    conn.audioEl.srcObject = null
  } catch {
    // ignore
  }
}

