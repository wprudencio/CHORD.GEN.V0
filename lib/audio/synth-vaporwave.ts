// ============================================================
// VAPORWAVE SYNTH ENGINE — polished 80s sound design
// DX7-style FM, Juno chorus pads, gated-reverb drums,
// LinnDrum/808 hybrid drums, tape-wow detune, warm saturation.
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

// Soft tape-style saturation
function makeTapeCurve(drive = 1.4): Float32Array<ArrayBuffer> {
  const size = 1024
  const curve = new Float32Array(size) as Float32Array<ArrayBuffer>
  for (let i = 0; i < size; i++) {
    const x = (i - size / 2) / (size / 2)
    curve[i] = Math.tanh(x * drive)
  }
  return curve
}

// Very gentle bit-crush for that VHS DAC flavor
function makeVhsCurve(bits = 14, drive = 1.1): Float32Array<ArrayBuffer> {
  const size = 1024
  const steps = Math.pow(2, bits)
  const curve = new Float32Array(size) as Float32Array<ArrayBuffer>
  for (let i = 0; i < size; i++) {
    const x = (i - size / 2) / (size / 2)
    const driven = Math.tanh(x * drive)
    curve[i] = Math.round(driven * steps) / steps
  }
  return curve
}

function connectReverb(node: AudioNode, reverbSend: AudioNode | null, amount: number) {
  if (reverbSend && amount > 0.001) {
    const sendGain = node.context.createGain()
    sendGain.gain.value = amount
    node.connect(sendGain).connect(reverbSend)
  }
}

// ============================================================
// DRUMS
// ============================================================

export function playKickVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  // Click
  const click = ctx.createOscillator()
  click.type = "sine"
  click.frequency.setValueAtTime(900, t)
  click.frequency.exponentialRampToValueAtTime(180, t + 0.006)
  const clickG = ctx.createGain()
  clickG.gain.setValueAtTime(vol * 0.6, t)
  clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.025)
  click.connect(clickG).connect(dest)
  connectReverb(clickG, reverbSend, revAmount * 0.2)
  // Body
  const body = ctx.createOscillator()
  body.type = "sine"
  body.frequency.setValueAtTime(130, t)
  body.frequency.exponentialRampToValueAtTime(42, t + 0.14)
  const bodyG = ctx.createGain()
  bodyG.gain.setValueAtTime(0, t)
  bodyG.gain.linearRampToValueAtTime(vol * 0.95, t + 0.008)
  bodyG.gain.exponentialRampToValueAtTime(0.001, t + 0.42)
  body.connect(bodyG).connect(dest)
  connectReverb(bodyG, reverbSend, revAmount * 0.35)
  click.start(t); click.stop(t + 0.04)
  body.start(t); body.stop(t + 0.5)
}

export function playSnareVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const gateTime = 0.13
  // Noise body — bandpassed for that 80s snap
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx, 0.5)
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 900
  const bp = ctx.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 2200
  bp.Q.value = 1.2
  const bodyG = ctx.createGain()
  bodyG.gain.setValueAtTime(0, t)
  bodyG.gain.linearRampToValueAtTime(vol * 0.9, t + 0.003)
  bodyG.gain.setValueAtTime(vol * 0.9, t + gateTime - 0.005)
  bodyG.gain.setValueAtTime(0.001, t + gateTime)
  noise.connect(hp).connect(bp).connect(bodyG).connect(dest)
  // Lots of reverb send pre-gate gives the classic gated-reverb wash
  connectReverb(bodyG, reverbSend, revAmount * 1.3)
  // Tonal snap
  const tone = ctx.createOscillator()
  tone.type = "triangle"
  tone.frequency.setValueAtTime(250, t)
  tone.frequency.exponentialRampToValueAtTime(180, t + 0.05)
  const toneG = ctx.createGain()
  toneG.gain.setValueAtTime(vol * 0.55, t)
  toneG.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  tone.connect(toneG).connect(dest)
  connectReverb(toneG, reverbSend, revAmount * 0.5)
  noise.start(t); noise.stop(t + gateTime + 0.02)
  tone.start(t); tone.stop(t + 0.12)
}

export function playHiHatVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number, open: boolean = false) {
  if (vol < 0.001) return
  const t = time
  const dur = open ? 0.22 : 0.035
  // Metallic square stack
  const freqs = [3500, 4700, 6000, 7800]
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, t)
  master.gain.linearRampToValueAtTime(vol * (open ? 0.35 : 0.5), t + 0.001)
  master.gain.setValueAtTime(vol * (open ? 0.35 : 0.5), t + dur * 0.8)
  master.gain.setValueAtTime(0.001, t + dur)
  master.connect(dest)
  connectReverb(master, reverbSend, revAmount * 0.25)
  freqs.forEach(f => {
    const o = ctx.createOscillator()
    o.type = "square"
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = 0.18
    o.connect(g).connect(master)
    o.start(t); o.stop(t + dur + 0.02)
  })
  // Add a little noise sizzle
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx, 0.3)
  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 12000
  const nG = ctx.createGain()
  nG.gain.setValueAtTime(vol * 0.2, t)
  nG.gain.exponentialRampToValueAtTime(0.001, t + dur)
  noise.connect(lp).connect(nG).connect(dest)
  connectReverb(nG, reverbSend, revAmount * 0.15)
  noise.start(t); noise.stop(t + dur + 0.01)
}

export function playClapVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const offsets = [0, 0.011, 0.024, 0.038]
  offsets.forEach((off, i) => {
    const noise = ctx.createBufferSource()
    noise.buffer = getNoiseBuffer(ctx, 0.2)
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 1400
    bp.Q.value = 1.4
    const g = ctx.createGain()
    const peak = vol * (i === offsets.length - 1 ? 0.85 : 0.42)
    g.gain.setValueAtTime(0.001, t + off)
    g.gain.linearRampToValueAtTime(peak, t + off + 0.001)
    g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.13)
    noise.connect(bp).connect(g).connect(dest)
    connectReverb(g, reverbSend, revAmount * 0.35)
    noise.start(t + off)
    noise.stop(t + off + 0.16)
  })
}

export function playRimVw(ctx: BaseAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const o1 = ctx.createOscillator()
  o1.type = "sine"
  o1.frequency.value = 850
  const o2 = ctx.createOscillator()
  o2.type = "triangle"
  o2.frequency.value = 1700
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.55, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.045)
  o1.connect(g); o2.connect(g)
  g.connect(dest)
  connectReverb(g, reverbSend, revAmount * 0.2)
  o1.start(t); o1.stop(t + 0.06)
  o2.start(t); o2.stop(t + 0.06)
}

// ============================================================
// SYNTHS
// ============================================================

type VoiceFn = (ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) => void

function adsrEnv(g: GainNode, t: number, a: number, d: number, s: number, r: number, peak: number, sustainLvl = peak * s) {
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + a)
  g.gain.linearRampToValueAtTime(sustainLvl, t + a + d)
  g.gain.setValueAtTime(sustainLvl, t + a + d + Math.max(0, r - 0.02))
  g.gain.exponentialRampToValueAtTime(0.001, t + a + d + r)
}

function makeVibrato(ctx: BaseAudioContext, freq: number, depth: number, start: number, stop: number): [OscillatorNode, GainNode] {
  const lfo = ctx.createOscillator()
  lfo.frequency.value = freq
  const lfoG = ctx.createGain()
  lfoG.gain.value = depth
  lfo.connect(lfoG)
  lfo.start(start)
  lfo.stop(stop)
  return [lfo, lfoG]
}

// 1) DX7 PAD — 4-op FM pad, slow attack, lush detuning
function playDx7Pad(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.1
  const voices = [
    { detune: -10, mod1Index: 0.45, mod2Index: 0.2 },
    { detune: 10, mod1Index: 0.4, mod2Index: 0.18 },
  ]
  const tape = ctx.createWaveShaper()
  tape.curve = makeTapeCurve(1.2)
  const amp = ctx.createGain()
  adsrEnv(amp, t, 0.35, 0.25, 0.75, dur * 0.8, vol * 0.35)
  tape.connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.7)
  voices.forEach(v => {
    const carrier = ctx.createOscillator()
    carrier.type = "sine"
    carrier.frequency.value = freq
    carrier.detune.value = v.detune
    const mod1 = ctx.createOscillator()
    mod1.type = "sine"
    mod1.frequency.value = freq * 2
    const mod1G = ctx.createGain()
    mod1G.gain.setValueAtTime(freq * v.mod1Index, t)
    mod1G.gain.exponentialRampToValueAtTime(freq * 0.02, t + dur * 0.6)
    mod1.connect(mod1G).connect(carrier.frequency)
    const mod2 = ctx.createOscillator()
    mod2.type = "sine"
    mod2.frequency.value = freq * 1
    const mod2G = ctx.createGain()
    mod2G.gain.setValueAtTime(freq * v.mod2Index, t)
    mod2G.gain.exponentialRampToValueAtTime(freq * 0.01, t + dur * 0.7)
    mod2.connect(mod2G).connect(carrier.frequency)
    carrier.connect(tape)
    carrier.start(t); carrier.stop(end)
    mod1.start(t); mod1.stop(end)
    mod2.start(t); mod2.stop(end)
  })
}

// 2) JUNO PAD — warm chorus pad
function playJunoPad(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.1
  const amp = ctx.createGain()
  adsrEnv(amp, t, 0.45, 0.3, 0.8, dur * 0.7, vol * 0.32)
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 10, t)
  f.frequency.exponentialRampToValueAtTime(freq * 2.2, t + dur * 0.5)
  f.Q.value = 1.2
  const [vib, vibG] = makeVibrato(ctx, 4.5, freq * 0.008, t, end)
  f.connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.65)
  const detunes = [-14, -7, 0, 7, 14]
  const waves = ["sawtooth", "sawtooth", "pulse", "sawtooth", "sawtooth"]
  detunes.forEach((d, i) => {
    const o = ctx.createOscillator()
    o.type = waves[i] as OscillatorType
    o.frequency.value = freq
    o.detune.value = d
    if (waves[i] === "pulse") {
      // Web Audio doesn't have pulse; use square with sub octave
      o.type = "square"
      o.frequency.value = freq * 0.5
    }
    o.connect(f)
    vibG.connect(o.detune)
    o.start(t); o.stop(end)
  })
}

// 3) DX BELL — bright FM bell
function playDxBell(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.05
  const carrier = ctx.createOscillator()
  carrier.type = "sine"
  carrier.frequency.value = freq
  const mod1 = ctx.createOscillator()
  mod1.type = "sine"
  mod1.frequency.value = freq * 14
  const mod1G = ctx.createGain()
  mod1G.gain.setValueAtTime(freq * 1.6, t)
  mod1G.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.45)
  mod1.connect(mod1G).connect(carrier.frequency)
  const mod2 = ctx.createOscillator()
  mod2.type = "sine"
  mod2.frequency.value = freq * 1
  const mod2G = ctx.createGain()
  mod2G.gain.setValueAtTime(freq * 0.5, t)
  mod2G.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.65)
  mod2.connect(mod2G).connect(carrier.frequency)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.5, t + 0.002)
  amp.gain.setValueAtTime(vol * 0.5, t + dur * 0.35)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  carrier.connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.75)
  carrier.start(t); carrier.stop(end)
  mod1.start(t); mod1.stop(end)
  mod2.start(t); mod2.stop(end)
}

// 4) BRASS STAB — punchy 80s brass
function playBrassStab(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.05
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.55, t + 0.025)
  amp.gain.setValueAtTime(vol * 0.55, t + dur * 0.55)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 5, t)
  f.frequency.exponentialRampToValueAtTime(freq * 1.3, t + dur * 0.6)
  f.Q.value = 4
  f.connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.55)
  const detunes = [-8, 0, 8]
  detunes.forEach(d => {
    const o = ctx.createOscillator()
    o.type = "sawtooth"
    o.frequency.value = freq
    o.detune.value = d
    o.connect(f)
    o.start(t); o.stop(end)
  })
}

// 5) DX PLUCK — short Rhodes-like pluck
function playDxPluck(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.05
  const carrier = ctx.createOscillator()
  carrier.type = "sine"
  carrier.frequency.value = freq
  const mod = ctx.createOscillator()
  mod.type = "sine"
  mod.frequency.value = freq * 3.5
  const modG = ctx.createGain()
  modG.gain.setValueAtTime(freq * 0.9, t)
  modG.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  mod.connect(modG).connect(carrier.frequency)
  const tape = ctx.createWaveShaper()
  tape.curve = makeTapeCurve(1.3)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.6, t + 0.003)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9)
  carrier.connect(tape).connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.45)
  carrier.start(t); carrier.stop(end)
  mod.start(t); mod.stop(end)
}

// 6) E.PIANO — DX7 E.PIANO 1 style
function playElecPiano(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.05
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.5, t + 0.004)
  amp.gain.setValueAtTime(vol * 0.5, t + dur * 0.5)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.value = freq * 8
  f.Q.value = 0.8
  f.connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.55)
  // Two carriers with shared modulator (ratio 14 gives the tine bite)
  const mod = ctx.createOscillator()
  mod.type = "sine"
  mod.frequency.value = freq * 14
  const modG = ctx.createGain()
  modG.gain.setValueAtTime(freq * 1.1, t)
  modG.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.35)
  const car1 = ctx.createOscillator()
  car1.type = "sine"
  car1.frequency.value = freq
  car1.detune.value = -4
  const car2 = ctx.createOscillator()
  car2.type = "sine"
  car2.frequency.value = freq
  car2.detune.value = 5
  mod.connect(modG)
  modG.connect(car1.frequency)
  modG.connect(car2.frequency)
  car1.connect(f); car2.connect(f)
  car1.start(t); car1.stop(end)
  car2.start(t); car2.stop(end)
  mod.start(t); mod.stop(end)
}

// 7) SLAP BASS — punchy 80s synth bass
function playSlapBass(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.05
  const saw = ctx.createOscillator()
  saw.type = "sawtooth"
  saw.frequency.value = freq
  const sub = ctx.createOscillator()
  sub.type = "sine"
  sub.frequency.value = freq
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 8, t)
  f.frequency.exponentialRampToValueAtTime(freq * 2.2, t + 0.12)
  f.Q.value = 3.5
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(vol * 0.7, t + 0.01)
  amp.gain.setValueAtTime(vol * 0.7, t + dur * 0.75)
  amp.gain.exponentialRampToValueAtTime(0.001, t + dur)
  saw.connect(f); sub.connect(f)
  f.connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.15)
  saw.start(t); saw.stop(end)
  sub.start(t); sub.stop(end)
}

// 8) STRINGS — 80s string machine
function playStrings(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, dur: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  const end = t + dur + 0.1
  const amp = ctx.createGain()
  adsrEnv(amp, t, 0.55, 0.35, 0.8, dur * 0.7, vol * 0.32)
  const f = ctx.createBiquadFilter()
  f.type = "lowpass"
  f.frequency.setValueAtTime(freq * 3.5, t)
  f.frequency.exponentialRampToValueAtTime(freq * 1.6, t + dur * 0.5)
  f.Q.value = 0.6
  const [vib, vibG] = makeVibrato(ctx, 5, freq * 0.006, t, end)
  f.connect(amp).connect(dest)
  connectReverb(amp, reverbSend, revAmount * 0.7)
  const detunes = [-16, -8, 0, 8, 16]
  detunes.forEach(d => {
    const o = ctx.createOscillator()
    o.type = "sawtooth"
    o.frequency.value = freq
    o.detune.value = d
    o.connect(f)
    vibG.connect(o.detune)
    o.start(t); o.stop(end)
  })
}

export type SynthVwType =
  | "dx7pad" | "chorusLead" | "dxBell" | "brassStab" | "dxPluck" | "vhsKeys" | "synthBass" | "strings"

const SYNTH_VW_MAP: Record<SynthVwType, VoiceFn> = {
  dx7pad: playDx7Pad,
  chorusLead: playJunoPad,
  dxBell: playDxBell,
  brassStab: playBrassStab,
  dxPluck: playDxPluck,
  vhsKeys: playElecPiano,
  synthBass: playSlapBass,
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
