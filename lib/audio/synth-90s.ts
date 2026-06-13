// ============================================================
// 90's SYNTH ENGINE
// Authentic late-80s / 90s synthesis: FM (DX7-style), pulse
// (pulse-waves like early samplers / Amiga MOD), chiptune
// (NES square/triangle), 16-bit PCM-ish (saturated short
// impulses), and 909-style analog drum machines.
// ============================================================

let _noiseBuffer: AudioBuffer | null = null

function getNoiseBuffer(ctx: BaseAudioContext, seconds: number = 2): AudioBuffer {
  if (_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate && _noiseBuffer.length >= ctx.sampleRate * seconds) {
    return _noiseBuffer
  }
  const len = Math.ceil(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1
  }
  _noiseBuffer = buf
  return buf
}

export function invalidateNoiseBuffer() {
  _noiseBuffer = null
}

// --- Helper: cheap 90s-style bit-crush + downsample chain ---
// Returns a WaveShaper curve that quantizes amplitude (bit crusher)
// and an overdriven tanh for warmth.
function makeBitCrushCurve(steps: number = 16, drive: number = 1.4): Float32Array {
  const size = 1024
  const curve = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    const x = (i - size / 2) / (size / 2)
    // soft drive (tanh) + amplitude quantization
    const driven = Math.tanh(x * drive)
    const q = Math.round(driven * steps) / steps
    curve[i] = q
  }
  return curve
}

// ============================================================
// 90s DRUMS — TR-909 inspired (analog + sample-like noise)
// ============================================================

// --- KICK 909: punchy 909 with a fast click + body resonance ---
export function playKick90s(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time

  // 1) Click — short noise burst through highpass
  const clickBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.01), ctx.sampleRate)
  const cd = clickBuf.getChannelData(0)
  for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * (1 - i / cd.length)
  const click = ctx.createBufferSource()
  click.buffer = clickBuf
  const clickHP = ctx.createBiquadFilter()
  clickHP.type = "highpass"
  clickHP.frequency.value = 1800
  const clickG = ctx.createGain()
  clickG.gain.value = vol * 0.6
  click.connect(clickHP).connect(clickG).connect(dest)
  if (reverbSend) clickG.connect(reverbSend)

  // 2) Body — sine sweep down 100Hz→45Hz
  const body = ctx.createOscillator()
  body.type = "sine"
  body.frequency.setValueAtTime(120, t)
  body.frequency.exponentialRampToValueAtTime(45, t + 0.08)
  const bodyG = ctx.createGain()
  bodyG.gain.setValueAtTime(vol * 1.0, t)
  bodyG.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
  body.connect(bodyG).connect(dest)
  if (reverbSend) bodyG.connect(reverbSend)

  click.start(t)
  click.stop(t + 0.015)
  body.start(t)
  body.stop(t + 0.5)
}

// --- SNARE 909: noisy body + tonal snap ---
export function playSnare90s(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time

  // Noise component (the snares)
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx, 0.5)
  const noiseHP = ctx.createBiquadFilter()
  noiseHP.type = "highpass"
  noiseHP.frequency.value = 1200
  const noiseG = ctx.createGain()
  noiseG.gain.setValueAtTime(vol * 0.7, t)
  noiseG.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  noise.connect(noiseHP).connect(noiseG).connect(dest)
  if (reverbSend) noiseG.connect(reverbSend)

  // Tonal snap (sine 200Hz)
  const tone = ctx.createOscillator()
  tone.type = "triangle"
  tone.frequency.value = 200
  const toneG = ctx.createGain()
  toneG.gain.setValueAtTime(vol * 0.45, t)
  toneG.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  tone.connect(toneG).connect(dest)
  if (reverbSend) toneG.connect(reverbSend)

  noise.start(t)
  noise.stop(t + 0.25)
  tone.start(t)
  tone.stop(t + 0.1)
}

// --- HAT 909: bright filtered noise, very short ---
export function playHiHat90s(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number, open: boolean = false) {
  if (vol < 0.001) return
  const t = time
  const dur = open ? 0.35 : 0.06
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx, 0.5)
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 7000
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * (open ? 0.4 : 0.55), t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  noise.connect(hp).connect(g).connect(dest)
  if (reverbSend) g.connect(reverbSend)
  noise.start(t)
  noise.stop(t + dur + 0.02)
}

// --- CLAP 909: layered noise bursts for the classic clap ---
export function playClap90s(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const offsets = [0, 0.012, 0.024, 0.036]
  offsets.forEach((off, i) => {
    const noise = ctx.createBufferSource()
    noise.buffer = getNoiseBuffer(ctx, 0.2)
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 1500
    bp.Q.value = 1
    const g = ctx.createGain()
    const peak = vol * (i === offsets.length - 1 ? 0.7 : 0.4)
    g.gain.setValueAtTime(0.001, t + off)
    g.gain.linearRampToValueAtTime(peak, t + off + 0.001)
    g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.15)
    noise.connect(bp).connect(g).connect(dest)
    if (reverbSend) g.connect(reverbSend)
    noise.start(t + off)
    noise.stop(t + off + 0.2)
  })
}

// --- RIM 909: short tonal blip ---
export function playRim90s(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx, 0.1)
  const bp = ctx.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 800
  bp.Q.value = 6
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
  noise.connect(bp).connect(g).connect(dest)
  if (reverbSend) g.connect(reverbSend)
  noise.start(t)
  noise.stop(t + 0.05)
}

// ============================================================
// 90s SYNTHS — 8 chiptune-flavored synth types
// All use NES/Game Boy style square + triangle waves with
// bit-crush, short attacks, and limited harmonics.
// ============================================================

// 1) FM — NES-style 2-op FM with square carrier (DX7-meets-NES bell)
function playFM(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const carrier = ctx.createOscillator()
  carrier.type = "square"
  carrier.frequency.value = freq
  const modulator = ctx.createOscillator()
  modulator.type = "square"
  modulator.frequency.value = freq * 2
  const modGain = ctx.createGain()
  modGain.gain.setValueAtTime(freq * 0.8, t)
  modGain.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.5)
  modulator.connect(modGain).connect(carrier.frequency)
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(10, 1.3)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.5, t + 0.003)
  amp.gain.setValueAtTime(vol * 0.5, t + dur * 0.6)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  carrier.connect(crusher).connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  carrier.start(t); carrier.stop(t + dur + 0.05)
  modulator.start(t); modulator.stop(t + dur + 0.05)
}

// 2) PULSE — NES pulse wave with 25% duty cycle (classic NES tone)
function playPulse(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const osc = ctx.createOscillator()
  // Build a custom 25%-duty pulse (NES duty 0)
  const wave = ctx.createPeriodicWave(
    new Float32Array(32),
    (() => { const im = new Float32Array(32); for (let n = 1; n < 32; n++) im[n] = (2 / n) * Math.sin(n * Math.PI * 0.25); return im })(),
    { disableNormalization: false }
  )
  osc.setPeriodicWave(wave)
  osc.frequency.value = freq
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(8, 1.4)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.55, t + 0.002)
  amp.gain.setValueAtTime(vol * 0.55, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(crusher).connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  osc.start(t); osc.stop(t + dur + 0.05)
}

// 3) CHIPTUNE — NES square + triangle (Game Boy style)
function playChip(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const sq = ctx.createOscillator()
  sq.type = "square"
  sq.frequency.value = freq
  const tri = ctx.createOscillator()
  tri.type = "triangle"
  tri.frequency.value = freq
  const sqG = ctx.createGain()
  sqG.gain.value = 0.6
  const triG = ctx.createGain()
  triG.gain.value = 0.4
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(8, 1.4)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.5, t + 0.002)
  amp.gain.setValueAtTime(vol * 0.5, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  sq.connect(sqG).connect(crusher)
  tri.connect(triG).connect(crusher)
  crusher.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  sq.start(t); sq.stop(t + dur + 0.05)
  tri.start(t); tri.stop(t + dur + 0.05)
}

// 4) PCM — chiptune organ: stacked square octaves + triangle sub (chiptune Hammond)
function playPCM(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // Stack: square (root), square (octave), triangle (fifth), triangle (sub)
  const parts = [
    { type: "square" as const, mult: 1.0, gain: 0.5 },
    { type: "square" as const, mult: 2.0, gain: 0.25 },
    { type: "triangle" as const, mult: 1.5, gain: 0.3 },
    { type: "triangle" as const, mult: 0.5, gain: 0.35 },
  ]
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(12, 1.2)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.55, t + 0.003)
  amp.gain.setValueAtTime(vol * 0.55, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  crusher.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  parts.forEach(p => {
    const o = ctx.createOscillator()
    o.type = p.type
    o.frequency.value = freq * p.mult
    const g = ctx.createGain()
    g.gain.value = p.gain
    o.connect(g).connect(crusher)
    o.start(t); o.stop(t + dur + 0.05)
  })
}

// 5) ANALOG — square + saw (square dominant) with hard bit-crush (C64 SID vibe)
function playAnalog(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const sq = ctx.createOscillator()
  sq.type = "square"
  sq.frequency.value = freq
  sq.detune.value = -8
  const tri = ctx.createOscillator()
  tri.type = "sawtooth"
  tri.frequency.value = freq
  tri.detune.value = 8
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(7, 1.5)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.5, t + 0.002)
  amp.gain.setValueAtTime(vol * 0.5, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  sq.connect(crusher)
  tri.connect(crusher)
  crusher.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  sq.start(t); sq.stop(t + dur + 0.05)
  tri.start(t); tri.stop(t + dur + 0.05)
}

// 6) TRACKER — Amiga MOD style: square + triangle, vibrato, sharp envelope
function playTracker(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const sq = ctx.createOscillator()
  sq.type = "square"
  sq.frequency.value = freq
  // Vibrato (slight detune modulation)
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 8
  const lfoG = ctx.createGain()
  lfoG.gain.value = freq * 0.015
  lfo.connect(lfoG).connect(sq.frequency)
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(10, 1.3)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.55, t + 0.002)
  amp.gain.setValueAtTime(vol * 0.55, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  sq.connect(crusher).connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  sq.start(t); sq.stop(t + dur + 0.05)
  lfo.start(t); lfo.stop(t + dur + 0.05)
}

// 7) PLUCK — chiptune pluck: square with very fast decay, NES-style
function playPluck90s(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const sq = ctx.createOscillator()
  sq.type = "square"
  sq.frequency.value = freq
  // Tiny pitch envelope down (chiptune pluck feel)
  sq.frequency.setValueAtTime(freq * 1.5, t)
  sq.frequency.exponentialRampToValueAtTime(freq, t + 0.04)
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(8, 1.4)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.6, t + 0.001)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  sq.connect(crusher).connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  sq.start(t); sq.stop(t + dur + 0.05)
}

// 8) PAD — slow-attack chiptune pad: stacked squares + triangle, detuned, bit-crushed
function playPad90s(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // Two slightly detuned square voices + a triangle below
  const sq1 = ctx.createOscillator()
  sq1.type = "square"
  sq1.frequency.value = freq
  sq1.detune.value = -6
  const sq2 = ctx.createOscillator()
  sq2.type = "square"
  sq2.frequency.value = freq
  sq2.detune.value = 6
  const tri = ctx.createOscillator()
  tri.type = "triangle"
  tri.frequency.value = freq / 2
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeBitCrushCurve(10, 1.3)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.4, t + 0.1)
  amp.gain.setValueAtTime(vol * 0.4, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  sq1.connect(crusher)
  sq2.connect(crusher)
  tri.connect(crusher)
  crusher.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  sq1.start(t); sq1.stop(t + dur + 0.05)
  sq2.start(t); sq2.stop(t + dur + 0.05)
  tri.start(t); tri.stop(t + dur + 0.05)
}

export type Synth90sType =
  | "fm" | "pulse" | "chip" | "pcm" | "analog" | "tracker" | "pluck90" | "pad90"

const SYNTH_90S_MAP: Record<Synth90sType, (ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) => void> = {
  fm: playFM,
  pulse: playPulse,
  chip: playChip,
  pcm: playPCM,
  analog: playAnalog,
  tracker: playTracker,
  pluck90: playPluck90s,
  pad90: playPad90s,
}

export const SYNTH_90S_TYPES: Synth90sType[] = ["fm", "pulse", "chip", "pcm", "analog", "tracker", "pluck90", "pad90"]

export function playSynth90sNote(
  ctx: BaseAudioContext,
  dest: AudioNode,
  reverbSend: AudioNode,
  freq: number,
  time: number,
  duration: number,
  synthType: string,
  vol: number,
  revAmount: number
) {
  const fn = SYNTH_90S_MAP[synthType as Synth90sType] || playFM
  fn(ctx, dest, time, freq, duration, vol, reverbSend, revAmount)
}
