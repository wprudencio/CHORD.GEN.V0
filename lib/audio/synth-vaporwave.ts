// ============================================================
// VAPORWAVE SYNTH ENGINE
// 80s-inspired: DX7-style FM pads, gated reverb drums,
// LinnDrum-style samples via synthesis, chorused supersaw,
// VHS degradation via bit-crush + downsampling.
// ============================================================

let _noiseBuffer: AudioBuffer | null = null

function getNoiseBuffer(ctx: BaseAudioContext, seconds: number = 2): AudioBuffer {
  if (_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate && _noiseBuffer.length >= ctx.sampleRate * seconds) {
    return _noiseBuffer
  }
  const len = Math.ceil(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  _noiseBuffer = buf
  return buf
}

export function invalidateNoiseBuffer() { _noiseBuffer = null }

// VHS / lo-fi degradation curve: gentle bit crush + warm tanh
function makeVhsCurve(bits: number = 12, drive: number = 1.1): Float32Array {
  const size = 1024
  const curve = new Float32Array(size)
  const steps = Math.pow(2, bits)
  for (let i = 0; i < size; i++) {
    const x = (i - size / 2) / (size / 2)
    const driven = Math.tanh(x * drive)
    curve[i] = Math.round(driven * steps) / steps
  }
  return curve
}

// ============================================================
// VAPORWAVE DRUMS — LinnDrum + gated reverb
// ============================================================

// --- KICK: tight LinnDrum-style (punchy 808-meets-LM-1)
export function playKickVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // Click (very short, like a LinnDrum sample attack)
  const click = ctx.createOscillator()
  click.type = "sine"
  click.frequency.setValueAtTime(900, t)
  click.frequency.exponentialRampToValueAtTime(200, t + 0.005)
  const clickG = ctx.createGain()
  clickG.gain.setValueAtTime(vol * 0.7, t)
  clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
  click.connect(clickG).connect(dest)
  if (reverbSend) clickG.connect(reverbSend)
  // Body
  const body = ctx.createOscillator()
  body.type = "sine"
  body.frequency.setValueAtTime(110, t)
  body.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  const bodyG = ctx.createGain()
  bodyG.gain.setValueAtTime(vol * 0.95, t)
  bodyG.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  body.connect(bodyG).connect(dest)
  if (reverbSend) bodyG.connect(reverbSend)
  click.start(t); click.stop(t + 0.03)
  body.start(t); body.stop(t + 0.45)
}

// --- SNARE: gated reverb style (the classic 80s production trick)
export function playSnareVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // Noise body (filtered)
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx, 0.5)
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 1500
  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 8000
  // The "gate" — hard envelope that cuts off at ~0.18s, no natural decay
  const bodyG = ctx.createGain()
  bodyG.gain.setValueAtTime(0, t)
  bodyG.gain.linearRampToValueAtTime(vol * 0.85, t + 0.002)
  bodyG.gain.setValueAtTime(vol * 0.85, t + 0.16)
  // Hard gate: cut to silence at exactly 0.18s (the gated reverb signature)
  bodyG.gain.setValueAtTime(0.001, t + 0.18)
  noise.connect(hp).connect(lp).connect(bodyG).connect(dest)
  if (reverbSend) bodyG.connect(reverbSend)
  // Tonal snap
  const tone = ctx.createOscillator()
  tone.type = "triangle"
  tone.frequency.setValueAtTime(220, t)
  tone.frequency.exponentialRampToValueAtTime(180, t + 0.04)
  const toneG = ctx.createGain()
  toneG.gain.setValueAtTime(vol * 0.5, t)
  toneG.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  tone.connect(toneG).connect(dest)
  if (reverbSend) toneG.connect(reverbSend)
  noise.start(t); noise.stop(t + 0.2)
  tone.start(t); tone.stop(t + 0.1)
}

// --- HIHAT: LinnDrum-style (metallic, gated)
export function playHiHatVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number, open: boolean = false) {
  if (vol < 0.001) return
  const t = time
  // Use multiple square waves at high freqs for metallic timbre
  const freqs = [4000, 5000, 6000, 8000]
  const dur = open ? 0.25 : 0.04
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, t)
  master.gain.linearRampToValueAtTime(vol * (open ? 0.35 : 0.55), t + 0.001)
  // Gated cutoff (no exponential decay — hard cut for LinnDrum snap)
  master.gain.setValueAtTime(vol * (open ? 0.35 : 0.55), t + dur * 0.85)
  master.gain.setValueAtTime(0.001, t + dur)
  master.connect(dest)
  if (reverbSend) master.connect(reverbSend)
  freqs.forEach(f => {
    const o = ctx.createOscillator()
    o.type = "square"
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = 0.2
    o.connect(g).connect(master)
    o.start(t); o.stop(t + dur + 0.02)
  })
}

// --- CLAP: 80s-style handclap (multiple short bursts)
export function playClapVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const offsets = [0, 0.01, 0.022, 0.035]
  offsets.forEach((off, i) => {
    const noise = ctx.createBufferSource()
    noise.buffer = getNoiseBuffer(ctx, 0.2)
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 1300
    bp.Q.value = 1.5
    const g = ctx.createGain()
    const peak = vol * (i === offsets.length - 1 ? 0.8 : 0.45)
    g.gain.setValueAtTime(0.001, t + off)
    g.gain.linearRampToValueAtTime(peak, t + off + 0.001)
    g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.12)
    noise.connect(bp).connect(g).connect(dest)
    if (reverbSend) g.connect(reverbSend)
    noise.start(t + off)
    noise.stop(t + off + 0.15)
  })
}

// --- RIM: 80s rim shot (short tonal click)
export function playRimVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const o1 = ctx.createOscillator()
  o1.type = "sine"
  o1.frequency.value = 820
  const o2 = ctx.createOscillator()
  o2.type = "sine"
  o2.frequency.value = 1700
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.6, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  o1.connect(g); o2.connect(g)
  g.connect(dest)
  if (reverbSend) g.connect(reverbSend)
  o1.start(t); o1.stop(t + 0.06)
  o2.start(t); o2.stop(t + 0.06)
}

// ============================================================
// VAPORWAVE SYNTHS — 8 synth types
// DX7 pads, chorused leads, 80s brass, plucked DX bells, etc.
// ============================================================

// 1) DX7 PAD — 4-op FM pad with slow attack, lush chorus via detuning
function playDx7Pad(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // 2 carriers + 2 modulators per voice, 2 voices detuned for chorus
  const voices = [
    { detune: -7, volScale: 1.0 },
    { detune: 7, volScale: 0.9 },
  ]
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeVhsCurve(14, 1.05)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.4, t + 0.4)
  amp.gain.setValueAtTime(vol * 0.4, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  crusher.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  voices.forEach(v => {
    const carrier = ctx.createOscillator()
    carrier.type = "sine"
    carrier.frequency.value = freq
    carrier.detune.value = v.detune
    // Modulator 1: ratio 2, low index → bell-like harmonic
    const mod1 = ctx.createOscillator()
    mod1.type = "sine"
    mod1.frequency.value = freq * 2
    const mod1G = ctx.createGain()
    mod1G.gain.setValueAtTime(freq * 0.4 * v.volScale, t)
    mod1G.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.6)
    mod1.connect(mod1G).connect(carrier.frequency)
    // Modulator 2: ratio 1, even lower index → warmth
    const mod2 = ctx.createOscillator()
    mod2.type = "sine"
    mod2.frequency.value = freq
    const mod2G = ctx.createGain()
    mod2G.gain.setValueAtTime(freq * 0.2 * v.volScale, t)
    mod2G.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.6)
    mod2.connect(mod2G).connect(carrier.frequency)
    carrier.connect(crusher)
    carrier.start(t); carrier.stop(t + dur + 0.05)
    mod1.start(t); mod1.stop(t + dur + 0.05)
    mod2.start(t); mod2.stop(t + dur + 0.05)
  })
}

// 2) CHORUS LEAD — detuned sawtooth with vibrato (80s solo synth)
function playChorusLead(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // 3 detuned saw voices for thick chorus
  const detunes = [-9, 0, 9]
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 6, t)
  f.frequency.exponentialRampToValueAtTime(freq * 2, t + dur * 0.5)
  f.Q.value = 2
  // Vibrato
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 5
  const lfoG = ctx.createGain()
  lfoG.gain.value = freq * 0.012
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeVhsCurve(13, 1.1)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.45, t + 0.04)
  amp.gain.setValueAtTime(vol * 0.45, t + dur * 0.6)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  crusher.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  detunes.forEach(d => {
    const o = ctx.createOscillator()
    o.type = "sawtooth"
    o.frequency.value = freq
    o.detune.value = d
    o.connect(lfoG)
    o.connect(f)
    o.start(t); o.stop(t + dur + 0.05)
  })
  lfo.start(t); lfo.stop(t + dur + 0.05)
  // Also add vibrato to lfo's main signal — connect lfo to a master freq offset
  lfo.connect(lfoG)
  lfoG.connect(f.detune) // subtle wobble on the filter
}

// 3) DX BELL — 4-op FM bell (E.PIANO style)
function playDxBell(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const carrier = ctx.createOscillator()
  carrier.type = "sine"
  carrier.frequency.value = freq
  // Two modulators stacked
  const mod1 = ctx.createOscillator()
  mod1.type = "sine"
  mod1.frequency.value = freq * 14
  const mod1G = ctx.createGain()
  mod1G.gain.setValueAtTime(freq * 1.2, t)
  mod1G.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5)
  mod1.connect(mod1G).connect(carrier.frequency)
  const mod2 = ctx.createOscillator()
  mod2.type = "sine"
  mod2.frequency.value = freq
  const mod2G = ctx.createGain()
  mod2G.gain.setValueAtTime(freq * 0.8, t)
  mod2G.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.7)
  mod2.connect(mod2G).connect(carrier.frequency)
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeVhsCurve(14, 1.05)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.55, t + 0.002)
  amp.gain.setValueAtTime(vol * 0.55, t + dur * 0.4)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  carrier.connect(crusher).connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  carrier.start(t); carrier.stop(t + dur + 0.05)
  mod1.start(t); mod1.stop(t + dur + 0.05)
  mod2.start(t); mod2.stop(t + dur + 0.05)
}

// 4) BRASS STAB — punchy 80s brass hit (sax-section stab)
function playBrassStab(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // Square root of 2-ish wave via detuned saws + filter
  const o1 = ctx.createOscillator()
  o1.type = "sawtooth"
  o1.frequency.value = freq
  o1.detune.value = -5
  const o2 = ctx.createOscillator()
  o2.type = "sawtooth"
  o2.frequency.value = freq
  o2.detune.value = 5
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 3, t)
  f.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur * 0.7)
  f.Q.value = 5
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.55, t + 0.02)
  amp.gain.setValueAtTime(vol * 0.55, t + dur * 0.5)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o1.connect(f); o2.connect(f)
  f.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  o1.start(t); o1.stop(t + dur + 0.05)
  o2.start(t); o2.stop(t + dur + 0.05)
}

// 5) PLUCKED DX — short FM pluck (Rhodes-like)
function playDxPluck(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const carrier = ctx.createOscillator()
  carrier.type = "sine"
  carrier.frequency.value = freq
  const mod = ctx.createOscillator()
  mod.type = "sine"
  mod.frequency.value = freq * 3
  const modG = ctx.createGain()
  modG.gain.setValueAtTime(freq * 0.7, t)
  modG.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  mod.connect(modG).connect(carrier.frequency)
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeVhsCurve(14, 1.05)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.6, t + 0.002)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  carrier.connect(crusher).connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  carrier.start(t); carrier.stop(t + dur + 0.05)
  mod.start(t); mod.stop(t + dur + 0.05)
}

// 6) VHS KEYS — electric piano with VHS degradation
function playVhsKeys(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // Rhodes-like: sine carrier + low-ratio modulator, slight detune
  const o1 = ctx.createOscillator()
  o1.type = "sine"
  o1.frequency.value = freq
  o1.detune.value = -4
  const o2 = ctx.createOscillator()
  o2.type = "sine"
  o2.frequency.value = freq
  o2.detune.value = 4
  // Tine mod
  const mod = ctx.createOscillator()
  mod.type = "sine"
  mod.frequency.value = freq * 7
  const modG = ctx.createGain()
  modG.gain.setValueAtTime(freq * 0.25, t)
  modG.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.4)
  mod.connect(modG).connect(o1.frequency)
  mod.connect(modG).connect(o2.frequency)
  // Heavy VHS
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeVhsCurve(10, 1.2)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.5, t + 0.005)
  amp.gain.setValueAtTime(vol * 0.5, t + dur * 0.6)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o1.connect(crusher); o2.connect(crusher)
  crusher.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  o1.start(t); o1.stop(t + dur + 0.05)
  o2.start(t); o2.stop(t + dur + 0.05)
  mod.start(t); mod.stop(t + dur + 0.05)
}

// 7) SYNTH BASS — punchy 80s synth bass (saw + sub)
function playSynthBass(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const saw = ctx.createOscillator()
  saw.type = "sawtooth"
  saw.frequency.value = freq
  const sub = ctx.createOscillator()
  sub.type = "sine"
  sub.frequency.value = freq
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 6, t)
  f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur * 0.4)
  f.Q.value = 4
  const sawG = ctx.createGain()
  sawG.gain.value = 0.5
  const subG = ctx.createGain()
  subG.gain.value = 0.7
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.65, t + 0.01)
  amp.gain.setValueAtTime(vol * 0.65, t + dur * 0.7)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  saw.connect(sawG).connect(f)
  sub.connect(subG).connect(f)
  f.connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  saw.start(t); saw.stop(t + dur + 0.05)
  sub.start(t); sub.stop(t + dur + 0.05)
}

// 8) STRINGS — slow-attack saw strings (1980s string machine)
function playStrings(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // 3 detuned saws
  const detunes = [-12, 0, 12]
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 4, t)
  f.frequency.exponentialRampToValueAtTime(freq * 1.8, t + dur * 0.5)
  f.Q.value = 1
  const crusher = ctx.createWaveShaper()
  crusher.curve = makeVhsCurve(13, 1.1)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.4, t + 0.15)
  amp.gain.setValueAtTime(vol * 0.4, t + dur * 0.6)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  f.connect(crusher).connect(amp).connect(dest)
  if (reverbSend) amp.connect(reverbSend)
  detunes.forEach(d => {
    const o = ctx.createOscillator()
    o.type = "sawtooth"
    o.frequency.value = freq
    o.detune.value = d
    o.connect(f)
    o.start(t); o.stop(t + dur + 0.05)
  })
}

export type SynthVwType =
  | "dx7pad" | "chorusLead" | "dxBell" | "brassStab" | "dxPluck" | "vhsKeys" | "synthBass" | "strings"

const SYNTH_VW_MAP: Record<SynthVwType, (ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) => void> = {
  dx7pad: playDx7Pad,
  chorusLead: playChorusLead,
  dxBell: playDxBell,
  brassStab: playBrassStab,
  dxPluck: playDxPluck,
  vhsKeys: playVhsKeys,
  synthBass: playSynthBass,
  strings: playStrings,
}

export const SYNTH_VW_TYPES: SynthVwType[] = ["dx7pad", "chorusLead", "dxBell", "brassStab", "dxPluck", "vhsKeys", "synthBass", "strings"]

export function playSynthVwNote(
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
  const fn = SYNTH_VW_MAP[synthType as SynthVwType] || playDx7Pad
  fn(ctx, dest, time, freq, duration, vol, reverbSend, revAmount)
}
