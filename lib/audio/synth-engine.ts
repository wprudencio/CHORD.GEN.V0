// ============================================================
// SYNTH ENGINE — Refactored sound synthesis
// Dramatically improved drums (use shared noise buffer)
// and synths (richer oscillators, better envelopes, per-voice processing)
// ============================================================

// --- Shared noise buffer generator (created once per context) ---
let _noiseBuffer: AudioBuffer | null = null

function getNoiseBuffer(ctx: BaseAudioContext, seconds: number = 2): AudioBuffer {
  if (_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate && _noiseBuffer.length >= ctx.sampleRate * seconds) {
    return _noiseBuffer
  }
  const len = Math.ceil(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // Fill with white noise using multiply-add for better randomness distribution
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1
  }
  _noiseBuffer = buf
  return buf
}

function invalidateNoiseBuffer() {
  _noiseBuffer = null
}

// Simple tanh soft-clipper curve
function makeSoftClipCurve(size: number = 256, drive: number = 1.5): Float32Array {
  const curve = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    const x = (i - size / 2) / (size / 2)
    curve[i] = Math.tanh(x * drive)
  }
  return curve
}

// ============================================================
// DRUM SYNTHESIS — rebuilt for punch, body, and realism
// ============================================================

// --- KICK: deep punch with sub resonance, beater click, compressed body ---
export function playKick(ctx: AudioContext | OfflineAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time

  // Layer 1: Beater click — very short bandpass transient
  const clickBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.015), ctx.sampleRate)
  const clickData = clickBuf.getChannelData(0)
  for (let i = 0; i < clickData.length; i++) {
    clickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clickData.length, 12)
  }
  const clickSrc = ctx.createBufferSource()
  clickSrc.buffer = clickBuf
  const clickBP = ctx.createBiquadFilter()
  clickBP.type = "bandpass"
  clickBP.frequency.value = 1400
  clickBP.Q.value = 3
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(vol * 0.45, t)
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015)
  clickSrc.connect(clickBP)
  clickBP.connect(clickGain)

  // Layer 2: Main body — sine sweep 150→38Hz with fast pitch envelope
  const bodyOsc = ctx.createOscillator()
  bodyOsc.type = "sine"
  bodyOsc.frequency.setValueAtTime(150, t)
  bodyOsc.frequency.exponentialRampToValueAtTime(38, t + 0.08)
  // Hold low then decay
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(vol * 0.9, t)
  bodyGain.gain.setValueAtTime(vol * 0.85, t + 0.01)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  bodyOsc.connect(bodyGain)

  // Layer 3: Sub thump — pure sine at 55Hz that decays slower for warmth
  const subOsc = ctx.createOscillator()
  subOsc.type = "sine"
  subOsc.frequency.value = 55
  // Subtle pitch envelope for the "thump"
  subOsc.frequency.setValueAtTime(75, t)
  subOsc.frequency.exponentialRampToValueAtTime(55, t + 0.05)
  const subGain = ctx.createGain()
  subGain.gain.setValueAtTime(vol * 0.55, t)
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  subOsc.connect(subGain)

  // Layer 4: EQ shaping — resonant lowpass for that "knock"
  const masterFilter = ctx.createBiquadFilter()
  masterFilter.type = "lowpass"
  masterFilter.frequency.setValueAtTime(800, t)
  masterFilter.frequency.exponentialRampToValueAtTime(300, t + 0.15)
  masterFilter.Q.value = 2.0

  // Slight distortion for warmth
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeSoftClipCurve(256, 1.2)

  const mixGain = ctx.createGain()
  clickGain.connect(mixGain)
  bodyGain.connect(masterFilter)
  subGain.connect(masterFilter)
  masterFilter.connect(shaper)
  shaper.connect(mixGain)

  // Dry/wet
  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  const rAmt = revAmount * 0.25
  dryG.gain.value = 1 - rAmt
  wetG.gain.value = rAmt
  mixGain.connect(dryG)
  mixGain.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  clickSrc.start(t)
  bodyOsc.start(t)
  subOsc.start(t)
  clickSrc.stop(t + 0.02)
  bodyOsc.stop(t + 0.45)
  subOsc.stop(t + 0.6)
}

// --- SNARE: transient crack + snare wire rattle + warm body ---
export function playSnare(ctx: AudioContext | OfflineAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time

  // Layer 1: Sharp transient crack
  const crackBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.008), ctx.sampleRate)
  const crackData = crackBuf.getChannelData(0)
  for (let i = 0; i < crackData.length; i++) {
    crackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackData.length, 6)
  }
  const crackSrc = ctx.createBufferSource()
  crackSrc.buffer = crackBuf
  const crackHP = ctx.createBiquadFilter()
  crackHP.type = "highpass"
  crackHP.frequency.value = 2500
  const crackGain = ctx.createGain()
  crackGain.gain.setValueAtTime(vol * 0.55, t)
  crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.008)
  crackSrc.connect(crackHP)
  crackHP.connect(crackGain)

  // Layer 2: Wire rattle — bandpass-filtered noise with resonant body
  const wireLen = Math.ceil(ctx.sampleRate * 0.18)
  const wireBuf = ctx.createBuffer(1, wireLen, ctx.sampleRate)
  const wireData = wireBuf.getChannelData(0)
  for (let i = 0; i < wireLen; i++) {
    wireData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / wireLen, 2.0)
  }
  const wireSrc = ctx.createBufferSource()
  wireSrc.buffer = wireBuf
  const wireBP1 = ctx.createBiquadFilter()
  wireBP1.type = "bandpass"
  wireBP1.frequency.value = 3500
  wireBP1.Q.value = 1.2
  const wireBP2 = ctx.createBiquadFilter()
  wireBP2.type = "peaking"
  wireBP2.frequency.value = 5200
  wireBP2.Q.value = 3.0
  wireBP2.gain.value = 4.0
  const wireGain = ctx.createGain()
  wireGain.gain.setValueAtTime(vol * 0.48, t)
  wireGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  wireSrc.connect(wireBP1)
  wireBP1.connect(wireBP2)
  wireBP2.connect(wireGain)

  // Layer 3: Shell body — sin+noise mixed for warm midrange
  const shellOsc = ctx.createOscillator()
  shellOsc.type = "triangle"
  shellOsc.frequency.value = 185
  const shellOGain = ctx.createGain()
  shellOGain.gain.setValueAtTime(vol * 0.35, t)
  shellOGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  shellOsc.connect(shellOGain)

  // Shell noise layer for body texture
  const bodyLen = Math.ceil(ctx.sampleRate * 0.15)
  const bodyBuf = ctx.createBuffer(1, bodyLen, ctx.sampleRate)
  const bodyData = bodyBuf.getChannelData(0)
  for (let i = 0; i < bodyLen; i++) {
    bodyData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bodyLen, 1.2)
  }
  const bodySrc = ctx.createBufferSource()
  bodySrc.buffer = bodyBuf
  const bodyLP = ctx.createBiquadFilter()
  bodyLP.type = "lowpass"
  bodyLP.frequency.setValueAtTime(1200, t)
  bodyLP.frequency.exponentialRampToValueAtTime(400, t + 0.08)
  bodyLP.Q.value = 1.0
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(vol * 0.4, t)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  bodySrc.connect(bodyLP)
  bodyLP.connect(bodyGain)

  // Mix
  const mixGain = ctx.createGain()
  crackGain.connect(mixGain)
  wireGain.connect(mixGain)
  shellOGain.connect(mixGain)
  bodyGain.connect(mixGain)

  // Slight compression via waveshaper
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeSoftClipCurve(256, 1.3)

  mixGain.connect(shaper)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  const rAmt = revAmount * 0.35
  dryG.gain.value = 1 - rAmt
  wetG.gain.value = rAmt
  shaper.connect(dryG)
  shaper.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  crackSrc.start(t)
  wireSrc.start(t)
  bodySrc.start(t)
  shellOsc.start(t)
  crackSrc.stop(t + 0.01)
  wireSrc.stop(t + 0.2)
  bodySrc.stop(t + 0.16)
  shellOsc.stop(t + 0.15)
}

// --- HI-HAT: metallic sizzle with tight closed / breathy open ---
export function playHiHat(ctx: AudioContext | OfflineAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number, open: boolean = false) {
  if (vol < 0.001) return
  const t = time
  const decayTime = open ? 0.45 : 0.06
  const hVol = vol * (open ? 0.4 : 0.45)

  // Layer 1: Metallic noise — 6 bandpass filters at inharmonic ratios for metallic texture
  const noiseBuf = getNoiseBuffer(ctx, 2)
  const periods = [1, 1.414, 1.732, 2.236, 2.645, 3.0] // √2, √3, √5, √7, √7, etc.
  const metalGain = ctx.createGain()
  metalGain.gain.setValueAtTime(hVol * 0.6, t)
  metalGain.gain.exponentialRampToValueAtTime(0.001, t + decayTime)

  const sumGain = ctx.createGain()

  for (const ratio of periods) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 1000 * ratio
    bp.Q.value = open ? 3.0 : 5.0
    src.connect(bp)
    bp.connect(metalGain)

    const srcStop = t + decayTime + 0.05
    src.start(t)
    src.stop(srcStop)
  }

  metalGain.connect(sumGain)

  // Layer 2: High sizzle — very short bright transient
  const sizzleBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * (open ? 0.15 : 0.02)), ctx.sampleRate)
  const sizzleData = sizzleBuf.getChannelData(0)
  const sizzleDecay = open ? 1.2 : 8
  for (let i = 0; i < sizzleData.length; i++) {
    sizzleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sizzleData.length, sizzleDecay)
  }
  const sizzleSrc = ctx.createBufferSource()
  sizzleSrc.buffer = sizzleBuf
  const sizzleHP = ctx.createBiquadFilter()
  sizzleHP.type = "highpass"
  sizzleHP.frequency.value = open ? 6000 : 9000
  const sizzleGain = ctx.createGain()
  sizzleGain.gain.setValueAtTime(hVol * 0.55, t)
  sizzleGain.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.12 : 0.015))
  sizzleSrc.connect(sizzleHP)
  sizzleHP.connect(sizzleGain)
  sizzleGain.connect(sumGain)

  // Layer 3: Closed-hat "stick" transient
  if (!open) {
    const stickBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.003), ctx.sampleRate)
    const stickData = stickBuf.getChannelData(0)
    for (let i = 0; i < stickData.length; i++) {
      stickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / stickData.length, 20)
    }
    const stickSrc = ctx.createBufferSource()
    stickSrc.buffer = stickBuf
    const stickBP = ctx.createBiquadFilter()
    stickBP.type = "bandpass"
    stickBP.frequency.value = 10000
    stickBP.Q.value = 2
    const stickGain = ctx.createGain()
    stickGain.gain.setValueAtTime(hVol * 0.7, t)
    stickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.003)
    stickSrc.connect(stickBP)
    stickBP.connect(stickGain)
    stickGain.connect(sumGain)
    stickSrc.start(t)
    stickSrc.stop(t + 0.005)
  }

  // Master filter for tone shaping
  const masterHP = ctx.createBiquadFilter()
  masterHP.type = "highpass"
  masterHP.frequency.value = open ? 4000 : 7000

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  const rAmt = revAmount * 0.3
  dryG.gain.value = 1 - rAmt
  wetG.gain.value = rAmt
  sumGain.connect(masterHP)
  masterHP.connect(dryG)
  masterHP.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  sizzleSrc.start(t)
  sizzleSrc.stop(t + (open ? 0.18 : 0.025))
}

// --- RIMSHOT: sharp, tight crack for percussion patterns ---
export function playRim(ctx: AudioContext | OfflineAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time

  // Sharp transient
  const transBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.006), ctx.sampleRate)
  const transData = transBuf.getChannelData(0)
  for (let i = 0; i < transData.length; i++) {
    transData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / transData.length, 15)
  }
  const transSrc = ctx.createBufferSource()
  transSrc.buffer = transBuf
  const transBP = ctx.createBiquadFilter()
  transBP.type = "bandpass"
  transBP.frequency.value = 3000
  transBP.Q.value = 4
  const transGain = ctx.createGain()
  transGain.gain.setValueAtTime(vol * 0.6, t)
  transGain.gain.exponentialRampToValueAtTime(0.001, t + 0.006)
  transSrc.connect(transBP)
  transBP.connect(transGain)

  // Wood tone
  const woodOsc = ctx.createOscillator()
  woodOsc.type = "triangle"
  woodOsc.frequency.value = 800
  const woodGain = ctx.createGain()
  woodGain.gain.setValueAtTime(vol * 0.4, t)
  woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
  woodOsc.connect(woodGain)

  const mixGain = ctx.createGain()
  transGain.connect(mixGain)
  woodGain.connect(mixGain)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  const rAmt = revAmount * 0.15
  dryG.gain.value = 1 - rAmt
  wetG.gain.value = rAmt
  mixGain.connect(dryG)
  mixGain.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  transSrc.start(t)
  woodOsc.start(t)
  transSrc.stop(t + 0.008)
  woodOsc.stop(t + 0.035)
}

// --- CLAP: layered noise bursts for classic electronic clap ---
export function playClap(ctx: AudioContext | OfflineAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time

  // Multiple micro-bursts for realistic clap texture
  const burstTimes = [0, 0.01, 0.02, 0.035]
  const mixGain = ctx.createGain()

  burstTimes.forEach((offset, idx) => {
    const burstDur = idx < 3 ? 0.015 : 0.25
    const burstBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * burstDur), ctx.sampleRate)
    const burstData = burstBuf.getChannelData(0)
    for (let i = 0; i < burstData.length; i++) {
      burstData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / burstData.length, idx < 3 ? 5 : 2.5)
    }
    const src = ctx.createBufferSource()
    src.buffer = burstBuf

    const filt = ctx.createBiquadFilter()
    filt.type = "bandpass"
    filt.frequency.value = 2200
    filt.Q.value = 1.5

    const gain = ctx.createGain()
    const burstVol = idx < 3 ? vol * 0.4 : vol * 0.55
    gain.gain.setValueAtTime(burstVol, t + offset)
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + burstDur)

    src.connect(filt)
    filt.connect(gain)
    gain.connect(mixGain)
    src.start(t + offset)
    src.stop(t + offset + burstDur + 0.01)
  })

  // Tail filter for warmth
  const tailHP = ctx.createBiquadFilter()
  tailHP.type = "highpass"
  tailHP.frequency.value = 800

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  const rAmt = revAmount * 0.4
  dryG.gain.value = 1 - rAmt
  wetG.gain.value = rAmt
  mixGain.connect(tailHP)
  tailHP.connect(dryG)
  tailHP.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)
}


// ============================================================
// SYNTH NOTE GENERATION — 10 new high-quality voices
// ============================================================

// Helper: stereo-width panning (simulated via allpass phase shift)
function makeStereoWidth(ctx: BaseAudioContext, node: AudioNode, width: number): AudioNode {
  if (width <= 0) return node
  const delay = ctx.createDelay()
  delay.delayTime.value = 0.0005 + width * 0.003
  node.connect(delay)
  const mix = ctx.createGain()
  mix.gain.value = width * 0.35
  delay.connect(mix)
  const out = ctx.createGain()
  node.connect(out)
  mix.connect(out)
  return out
}

// --- 1. CLOUD: ethereal ambient pad with 8 detuned sines, slow LFO filter ---
export function playCloudSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  const detuneCents = [-15, -10, -5, -2, 0, +2, +5, +10, +15]
  const mixBus = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.setValueAtTime(2500, time)
  filter.frequency.linearRampToValueAtTime(400, time + duration * 0.7)
  filter.Q.value = 1.5

  for (let i = 0; i < detuneCents.length; i++) {
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq
    osc.detune.value = detuneCents[i]
    const oscGain = ctx.createGain()
    oscGain.gain.value = 0.09
    osc.connect(oscGain)
    oscGain.connect(filter)
    osc.start(time)
    osc.stop(time + duration + 0.1)
  }

  // Slow LFO filter sweep
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.type = "sine"
  lfo.frequency.value = 0.15
  lfoGain.gain.value = 400
  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)
  lfo.start(time)
  lfo.stop(time + duration + 0.1)

  // Envelope: very slow attack, sustained, long release
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.14, time + 0.5)
  env.gain.setValueAtTime(vol * 0.12, time + duration - 0.5)
  env.gain.linearRampToValueAtTime(0.0001, time + duration)

  filter.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)
}

// --- 2. MARIMBA: bright mallet percussion with fast decay and wooden body ---
export function playMarimbaSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // Main voice: sine with sharp attack
  const osc = ctx.createOscillator()
  osc.type = "sine"
  osc.frequency.value = freq
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(vol * 0.55, time)
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + Math.min(duration * 0.6, 1.2))
  osc.connect(oscGain)

  // Wooden body resonance (noise burst)
  const bodyLen = Math.ceil(ctx.sampleRate * 0.08)
  const bodyBuf = ctx.createBuffer(1, bodyLen, ctx.sampleRate)
  const bodyData = bodyBuf.getChannelData(0)
  for (let i = 0; i < bodyLen; i++) {
    bodyData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bodyLen, 3.5)
  }
  const bodySrc = ctx.createBufferSource()
  bodySrc.buffer = bodyBuf
  const bodyLP = ctx.createBiquadFilter()
  bodyLP.type = "lowpass"
  bodyLP.frequency.value = 1200
  bodyLP.Q.value = 1.5
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(vol * 0.25, time)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08)
  bodySrc.connect(bodyLP)
  bodyLP.connect(bodyGain)

  // Bright transient click
  const clickBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.005), ctx.sampleRate)
  const clickData = clickBuf.getChannelData(0)
  for (let i = 0; i < clickData.length; i++) {
    clickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clickData.length, 10)
  }
  const clickSrc = ctx.createBufferSource()
  clickSrc.buffer = clickBuf
  const clickBP = ctx.createBiquadFilter()
  clickBP.type = "bandpass"
  clickBP.frequency.value = 4000
  clickBP.Q.value = 3
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(vol * 0.2, time)
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.005)
  clickSrc.connect(clickBP)
  clickBP.connect(clickGain)

  const mix = ctx.createGain()
  oscGain.connect(mix)
  bodyGain.connect(mix)
  clickGain.connect(mix)

  // Highpass to remove mud
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 80
  mix.connect(hp)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  hp.connect(dryG)
  hp.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  osc.start(time)
  osc.stop(time + duration + 0.1)
  bodySrc.start(time)
  bodySrc.stop(time + 0.09)
  clickSrc.start(time)
  clickSrc.stop(time + 0.01)
}

// --- 3. RHODES: electric piano with tine attack and warm bell body ---
export function playRhodesSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // Tine attack: short bright sine burst
  const tineOsc = ctx.createOscillator()
  tineOsc.type = "sine"
  tineOsc.frequency.value = freq * 2.5
  const tineGain = ctx.createGain()
  tineGain.gain.setValueAtTime(vol * 0.35, time)
  tineGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02)
  tineOsc.connect(tineGain)

  // Main body: FM bell-tone
  const carrier = ctx.createOscillator()
  carrier.type = "sine"
  carrier.frequency.value = freq
  const mod = ctx.createOscillator()
  mod.type = "sine"
  mod.frequency.value = freq * 2
  const modGain = ctx.createGain()
  modGain.gain.setValueAtTime(freq * 1.2, time)
  modGain.gain.exponentialRampToValueAtTime(freq * 0.08, time + 0.2)
  mod.connect(modGain)
  modGain.connect(carrier.frequency)

  // Warm overtone
  const overtone = ctx.createOscillator()
  overtone.type = "triangle"
  overtone.frequency.value = freq * 1.5
  const overtoneGain = ctx.createGain()
  overtoneGain.gain.value = 0.25
  overtone.connect(overtoneGain)

  // Filter
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = 6000
  filter.Q.value = 0.8

  // Envelope: fast attack, gentle sustain, medium release
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.32, time + 0.008)
  env.gain.setValueAtTime(vol * 0.18, time + 0.04)
  env.gain.linearRampToValueAtTime(0.0001, time + duration)

  carrier.connect(filter)
  overtoneGain.connect(filter)
  filter.connect(env)
  tineGain.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  carrier.start(time)
  mod.start(time)
  overtone.start(time)
  tineOsc.start(time)
  carrier.stop(time + duration + 0.1)
  mod.stop(time + duration + 0.1)
  overtone.stop(time + duration + 0.1)
  tineOsc.stop(time + 0.03)
}

// --- 4. ACID: classic 303-style acid with resonant filter envelope ---
export function playAcidSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // Sawtooth main voice
  const osc = ctx.createOscillator()
  osc.type = "sawtooth"
  osc.frequency.value = freq

  // Sub oscillator
  const sub = ctx.createOscillator()
  sub.type = "square"
  sub.frequency.value = Math.max(20, freq / 2)
  const subGain = ctx.createGain()
  subGain.gain.value = 0.35

  // Resonant lowpass filter with envelope
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.Q.value = 12
  filter.frequency.setValueAtTime(800, time)
  filter.frequency.exponentialRampToValueAtTime(5000, time + 0.03)
  filter.frequency.exponentialRampToValueAtTime(300, time + duration * 0.4)

  // Distortion for acid bite
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeSoftClipCurve(256, 3.0)

  // Envelope: snappy attack, tight decay
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.35, time + 0.005)
  env.gain.setValueAtTime(vol * 0.28, time + 0.03)
  env.gain.exponentialRampToValueAtTime(0.001, time + Math.min(duration, 1.5))

  osc.connect(filter)
  sub.connect(subGain)
  subGain.connect(filter)
  filter.connect(shaper)
  shaper.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  osc.start(time)
  sub.start(time)
  osc.stop(time + duration + 0.1)
  sub.stop(time + duration + 0.1)
}

// --- 5. VOX: vocal choir pad using formant bandpass filters ---
export function playVoxSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // Formant frequencies (approximate vowel "aah")
  const formants = [850, 1220, 2800]
  const formantGains = [1.0, 0.6, 0.3]
  const mixBus = ctx.createGain()

  // 3 detuned sawtooth voices
  const detuneCents = [-8, 0, +8]
  for (const cents of detuneCents) {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.value = freq
    osc.detune.value = cents
    const oscGain = ctx.createGain()
    oscGain.gain.value = 0.18
    osc.connect(oscGain)
    osc.start(time)
    osc.stop(time + duration + 0.1)

    // Formant filter chain
    for (let i = 0; i < formants.length; i++) {
      const bp = ctx.createBiquadFilter()
      bp.type = "bandpass"
      bp.frequency.value = formants[i]
      bp.Q.value = 6
      const g = ctx.createGain()
      g.gain.value = formantGains[i]
      oscGain.connect(bp)
      bp.connect(g)
      g.connect(mixBus)
    }
  }

  // Envelope: slow attack, sustained, gentle release
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.12, time + 0.4)
  env.gain.setValueAtTime(vol * 0.1, time + duration - 0.4)
  env.gain.linearRampToValueAtTime(0.0001, time + duration)

  mixBus.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)
}

// --- 6. GLASS: crystalline FM bell with multiple inharmonic ratios ---
export function playGlassSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // FM pairs with inharmonic ratios for glass-like tone
  const pairs = [
    { car: freq, mod: freq * 2.7, idx: 2.0, gain: 0.35 },
    { car: freq * 1.8, mod: freq * 4.1, idx: 1.2, gain: 0.25 },
    { car: freq * 3.2, mod: freq * 7.3, idx: 0.8, gain: 0.15 },
  ]

  const mixBus = ctx.createGain()

  for (const p of pairs) {
    const carrier = ctx.createOscillator()
    carrier.type = "sine"
    carrier.frequency.value = p.car
    const modulator = ctx.createOscillator()
    modulator.type = "sine"
    modulator.frequency.value = p.mod
    const modGain = ctx.createGain()
    modGain.gain.setValueAtTime(p.car * p.idx, time)
    modGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5)
    modulator.connect(modGain)
    modGain.connect(carrier.frequency)

    const g = ctx.createGain()
    g.gain.value = p.gain
    carrier.connect(g)
    g.connect(mixBus)
    carrier.start(time)
    carrier.stop(time + duration + 0.1)
    modulator.start(time)
    modulator.stop(time + duration + 0.1)
  }

  // Pure sine body for warmth
  const body = ctx.createOscillator()
  body.type = "sine"
  body.frequency.value = freq
  const bodyGain = ctx.createGain()
  bodyGain.gain.value = 0.5
  body.connect(bodyGain)
  bodyGain.connect(mixBus)
  body.start(time)
  body.stop(time + duration + 0.1)

  // Highpass to remove mud
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 100

  // Envelope: fast attack, very long decay
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.25, time + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.9)

  mixBus.connect(hp)
  hp.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)
}

// --- 7. ANALOG: vintage analog synth with pulse wave, sub, gentle filter ---
export function playAnalogSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // Pulse wave main
  const pulse = ctx.createOscillator()
  pulse.type = "square"
  pulse.frequency.value = freq

  // Sub octave
  const sub = ctx.createOscillator()
  sub.type = "sine"
  sub.frequency.value = Math.max(20, freq / 2)
  const subGain = ctx.createGain()
  subGain.gain.value = 0.35

  // Slightly detuned saw for warmth
  const saw = ctx.createOscillator()
  saw.type = "sawtooth"
  saw.frequency.value = freq
  saw.detune.value = 3
  const sawGain = ctx.createGain()
  sawGain.gain.value = 0.2

  // Gentle filter envelope
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.setValueAtTime(4000, time)
  filter.frequency.exponentialRampToValueAtTime(1200, time + duration * 0.5)
  filter.Q.value = 1.5

  // Warm saturation
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeSoftClipCurve(512, 1.4)

  // Envelope: medium attack, full sustain, gentle release
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.22, time + 0.06)
  env.gain.setValueAtTime(vol * 0.2, time + duration - 0.2)
  env.gain.linearRampToValueAtTime(0.0001, time + duration)

  pulse.connect(filter)
  sub.connect(subGain)
  subGain.connect(filter)
  saw.connect(sawGain)
  sawGain.connect(filter)
  filter.connect(shaper)
  shaper.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  pulse.start(time)
  sub.start(time)
  saw.start(time)
  pulse.stop(time + duration + 0.1)
  sub.stop(time + duration + 0.1)
  saw.stop(time + duration + 0.1)
}

// --- 8. FUTURE: modern future bass chord stack with 7 detuned saws ---
export function playFutureSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  const detuneCents = [-18, -12, -6, -2, 0, +2, +6, +12, +18]
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.setValueAtTime(7000, time)
  filter.frequency.exponentialRampToValueAtTime(2000, time + duration * 0.4)
  filter.Q.value = 2.5

  // Wide stereo via slight delay (simulated)
  const mixBus = ctx.createGain()

  for (const cents of detuneCents) {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.value = freq
    osc.detune.value = cents
    const g = ctx.createGain()
    g.gain.value = 0.09
    osc.connect(g)
    g.connect(mixBus)
    osc.start(time)
    osc.stop(time + duration + 0.1)
  }

  // Highpass to remove sub mud
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 120

  // Envelope: punchy attack, full sustain
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.18, time + 0.02)
  env.gain.setValueAtTime(vol * 0.16, time + duration - 0.1)
  env.gain.linearRampToValueAtTime(0.0001, time + duration)

  mixBus.connect(filter)
  filter.connect(hp)
  hp.connect(env)

  // Soft saturation
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeSoftClipCurve(256, 1.2)
  env.connect(shaper)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  shaper.connect(dryG)
  shaper.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)
}

// --- 9. ARP: classic 80s digital arpeggio pluck with square wave ---
export function playArpSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // Main square wave
  const osc = ctx.createOscillator()
  osc.type = "square"
  osc.frequency.value = freq

  // Octave up for brightness
  const oct = ctx.createOscillator()
  oct.type = "square"
  oct.frequency.value = freq * 2
  const octGain = ctx.createGain()
  octGain.gain.value = 0.3

  // Fast filter pluck
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.setValueAtTime(9000, time)
  filter.frequency.exponentialRampToValueAtTime(500, time + 0.18)
  filter.Q.value = 3.0

  // Bright transient noise
  const noiseDur = 0.02
  const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseDur), ctx.sampleRate)
  const noiseData = noiseBuf.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 5)
  }
  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noiseBuf
  const noiseHP = ctx.createBiquadFilter()
  noiseHP.type = "highpass"
  noiseHP.frequency.value = 6000
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(vol * 0.15, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDur)
  noiseSrc.connect(noiseHP)
  noiseHP.connect(noiseGain)

  // Fast exponential decay
  const env = ctx.createGain()
  env.gain.setValueAtTime(vol * 0.4, time)
  env.gain.exponentialRampToValueAtTime(0.001, time + Math.min(duration * 0.7, 1.5))

  osc.connect(filter)
  oct.connect(octGain)
  octGain.connect(filter)
  noiseGain.connect(filter)
  filter.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  osc.start(time)
  oct.start(time)
  noiseSrc.start(time)
  osc.stop(time + duration + 0.1)
  oct.stop(time + duration + 0.1)
  noiseSrc.stop(time + noiseDur + 0.01)
}

// --- 10. SWELL: cinematic orchestral swell using filtered noise + fundamental ---
export function playSwellSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  // Noise layer for breath/airy texture
  const noiseBuf = getNoiseBuffer(ctx, 2)
  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noiseBuf
  const noiseLP = ctx.createBiquadFilter()
  noiseLP.type = "lowpass"
  noiseLP.frequency.setValueAtTime(800, time)
  noiseLP.frequency.linearRampToValueAtTime(200, time + duration * 0.6)
  noiseLP.Q.value = 1.0
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.0001, time)
  noiseGain.gain.linearRampToValueAtTime(vol * 0.08, time + 0.8)
  noiseGain.gain.linearRampToValueAtTime(0.0001, time + duration)
  noiseSrc.connect(noiseLP)
  noiseLP.connect(noiseGain)

  // Fundamental sine for pitch center
  const fund = ctx.createOscillator()
  fund.type = "sine"
  fund.frequency.value = freq
  const fundGain = ctx.createGain()
  fundGain.gain.value = 0.4
  fund.connect(fundGain)

  // Warm overtone
  const overtone = ctx.createOscillator()
  overtone.type = "triangle"
  overtone.frequency.value = freq * 2
  const overtoneGain = ctx.createGain()
  overtoneGain.gain.value = 0.25
  overtone.connect(overtoneGain)

  // Filter
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.setValueAtTime(300, time)
  filter.frequency.linearRampToValueAtTime(3500, time + duration * 0.3)
  filter.frequency.linearRampToValueAtTime(600, time + duration * 0.8)
  filter.Q.value = 2.0

  // Slow swell envelope
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, time)
  env.gain.linearRampToValueAtTime(vol * 0.18, time + duration * 0.25)
  env.gain.setValueAtTime(vol * 0.15, time + duration * 0.7)
  env.gain.linearRampToValueAtTime(0.0001, time + duration)

  fundGain.connect(filter)
  overtoneGain.connect(filter)
  noiseGain.connect(filter)
  filter.connect(env)

  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = 1 - revAmt
  wetG.gain.value = revAmt
  env.connect(dryG)
  env.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)

  noiseSrc.start(time)
  noiseSrc.stop(time + duration + 0.1)
  fund.start(time)
  fund.stop(time + duration + 0.1)
  overtone.start(time)
  overtone.stop(time + duration + 0.1)
}

// ============================================================
// DISPATCH: play synth note by type
// ============================================================
export function playSynthNote(
  ctx: BaseAudioContext,
  dest: AudioNode,
  reverbSend: AudioNode,
  freq: number,
  time: number,
  duration: number,
  synthType: string,
  vol: number,
  revAmt: number,
  bpm: number
) {
  switch (synthType) {
    case "cloud":    playCloudSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "marimba":  playMarimbaSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "rhodes":   playRhodesSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "acid":     playAcidSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "vox":      playVoxSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "glass":    playGlassSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "analog":   playAnalogSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "future":   playFutureSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "arp":      playArpSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "swell":    playSwellSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    default:         playCloudSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
  }
}

// Re-export helpers for offline context
export { getNoiseBuffer, invalidateNoiseBuffer, makeSoftClipCurve }
