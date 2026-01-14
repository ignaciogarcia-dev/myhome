/**
 * Audio Domain Types
 *
 * Defines types for audio listening state and level monitoring.
 */

export interface AudioState {
  isListening: boolean
  updatedAt: number
}

export interface AudioLevel {
  level: number // 0..1, clamped
  timestamp: number
}
