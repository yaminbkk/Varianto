import type { SoundKind } from '../domain/learn/soundKind'

const STORAGE_KEY = 'varianto.sound'

let context: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (context) return context
  const Ctor = window.AudioContext
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    context = null
  }
  return context
}

interface Tone {
  at: number
  freq: number
  endFreq?: number
  duration: number
  type: OscillatorType
  gain: number
}

const TONES: Record<SoundKind, Tone[]> = {
  move: [{ at: 0, freq: 320, endFreq: 160, duration: 0.07, type: 'triangle', gain: 0.25 }],
  capture: [
    { at: 0, freq: 200, endFreq: 80, duration: 0.12, type: 'square', gain: 0.15 },
    { at: 0.02, freq: 420, endFreq: 140, duration: 0.08, type: 'triangle', gain: 0.2 },
  ],
  castle: [
    { at: 0, freq: 320, endFreq: 160, duration: 0.07, type: 'triangle', gain: 0.25 },
    { at: 0.1, freq: 380, endFreq: 190, duration: 0.07, type: 'triangle', gain: 0.25 },
  ],
  check: [
    { at: 0, freq: 660, duration: 0.09, type: 'sine', gain: 0.22 },
    { at: 0.1, freq: 880, duration: 0.12, type: 'sine', gain: 0.22 },
  ],
  wrong: [{ at: 0, freq: 170, endFreq: 120, duration: 0.2, type: 'sawtooth', gain: 0.12 }],
  finish: [
    { at: 0, freq: 523, duration: 0.12, type: 'sine', gain: 0.22 },
    { at: 0.12, freq: 659, duration: 0.12, type: 'sine', gain: 0.22 },
    { at: 0.24, freq: 784, duration: 0.2, type: 'sine', gain: 0.22 },
  ],
}

/** Plays a short synthesized sound. Does nothing when audio is unavailable. */
export function playSound(kind: SoundKind): void {
  const ctx = audio()
  if (!ctx) return
  void ctx.resume().catch(() => {})
  const start = ctx.currentTime
  for (const tone of TONES[kind]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const from = start + tone.at
    osc.type = tone.type
    osc.frequency.setValueAtTime(tone.freq, from)
    if (tone.endFreq) osc.frequency.exponentialRampToValueAtTime(tone.endFreq, from + tone.duration)
    gain.gain.setValueAtTime(tone.gain, from)
    gain.gain.exponentialRampToValueAtTime(0.001, from + tone.duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(from)
    osc.stop(from + tone.duration + 0.02)
  }
}

/** Sound is on unless the learner turned it off. Storage can be blocked, so failures mean "on". */
export function loadSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // The preference just does not persist.
  }
}
