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

// --- Global node cleanup pool to prevent memory and CPU leaks ---
const _nodeCleanupPool: Array<{ node: AudioNode; cleanupAt: number }> = []
let _cleanupInterval: ReturnType<typeof setInterval> | null = null

function scheduleNodeCleanup(node: AudioNode, cleanupAt: number) {
  _nodeCleanupPool.push({ node, cleanupAt })
  if (!_cleanupInterval) {
    _cleanupInterval = setInterval(() => {
      const now = performance.now()
      for (let i = _nodeCleanupPool.length - 1; i >= 0; i--) {
        if (now >= _nodeCleanupPool[i].cleanupAt) {
          try { _nodeCleanupPool[i].node.disconnect() } catch {}
          _nodeCleanupPool.splice(i, 1)
        }
      }
      if (_nodeCleanupPool.length === 0 && _cleanupInterval) {
        clearInterval(_cleanupInterval)
        _cleanupInterval = null
      }
    }, 500)
  }
}

const TRACKED_METHODS = [
  "createOscillator",
  "createGain",
  "createBiquadFilter",
  "createBufferSource",
  "createWaveShaper",
  "createConvolver",
  "createDynamicsCompressor",
  "createDelay",
  "createChannelSplitter",
  "createChannelMerger",
  "createPanner",
  "createStereoPanner",
  "createAnalyser",
] as const

const _patchedContexts = new WeakSet<BaseAudioContext>()

function patchContextForCleanup(ctx: BaseAudioContext) {
  if (_patchedContexts.has(ctx)) return
  _patchedContexts.add(ctx)

  for (const method of TRACKED_METHODS) {
    const original = (ctx as any)[method]
    if (typeof original !== "function") continue
    ;(ctx as any)[method] = function (...args: any[]) {
      const node = original.apply(ctx, args)
      scheduleNodeCleanup(node, performance.now() + 10000)
      return node
    }
  }
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
  patchContextForCleanup(ctx)
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
  patchContextForCleanup(ctx)
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
  patchContextForCleanup(ctx)
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
    const stickBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.003), ctx.sampleRate)
    const stickData = stickBuf.getChannelData(0)
    for (let i = 0; i < stickData.length; i++) {
      stickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / stickData.length, 10)
    }
    const stickSrc = ctx.createBufferSource()
    stickSrc.buffer = stickBuf
    const stickBP = ctx.createBiquadFilter()
    stickBP.type = "bandpass"
    stickBP.frequency.value = 8000
    const stickGain = ctx.createGain()
    stickGain.gain.setValueAtTime(hVol * 0.25, t)
    stickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.003)
    stickSrc.connect(stickBP)
    stickBP.connect(stickGain)
    stickGain.connect(sumGain)

    // Mix + envelope
    const env = ctx.createGain()
    env.gain.setValueAtTime(1, t)
    env.gain.exponentialRampToValueAtTime(0.001, t + decayTime)
    sumGain.connect(env)

    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    const rAmt = revAmount * 0.35
    dryG.gain.value = 1 - rAmt
    wetG.gain.value = rAmt
    env.connect(dryG)
    env.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

}

// --- RIMSHOT: sharp, tight crack for percussion patterns ---
export function playRim(ctx: AudioContext | OfflineAudioContext, dest: AudioNode, time: number, vol: number, reverbSend: AudioNode, revAmount: number) {
  if (vol < 0.001) return
  const t = time
  patchContextForCleanup(ctx)
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
  patchContextForCleanup(ctx)
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
// SYNTH NOTE GENERATION — rich, expressive voices
// ============================================================

// Helper: create a gain node with anti-click fade
function makeFadeGain(ctx: BaseAudioContext, vol: number, time: number, attack: number, sustain: number, release: number): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, time)
  g.gain.linearRampToValueAtTime(vol, time + attack)
  if (sustain > 0) {
    g.gain.setValueAtTime(vol, time + attack + sustain)
  }
  g.gain.linearRampToValueAtTime(0.0001, time + attack + sustain + release)
  return g
}

// Helper: apply reverb dry/wet
function applyReverb(ctx: BaseAudioContext, node: AudioNode, dest: AudioNode, reverbSend: AudioNode, vol: number, revAmount: number): GainNode {
  const dryG = ctx.createGain()
  const wetG = ctx.createGain()
  dryG.gain.value = (1 - revAmount)
  wetG.gain.value = revAmount
  node.connect(dryG)
  node.connect(wetG)
  dryG.connect(dest)
  wetG.connect(reverbSend)
  // Return a passthrough for chaining (not strictly needed but keeps patterns consistent)
  const out = ctx.createGain()
  out.gain.value = 1
  return out
}

// --- PAD: lush evolving texture with detune, chorus, and slow filter ---
export function playPadSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    // Voice 1: 5 detuned saws + 1 triangle for richness
    const detuneCents = [-8, -3, -1, +1, +3, +8]  // wider spread for more chorus
    const types: OscillatorType[] = ["sawtooth", "sawtooth", "sawtooth", "sawtooth", "triangle", "sawtooth"]
    const mixBus = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    // Slow filter sweep for movement
    filter.frequency.setValueAtTime(3000, time)
    filter.frequency.linearRampToValueAtTime(600, time + duration * 0.6)
    filter.Q.value = 1.2

    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator()
      osc.type = types[i]
      osc.frequency.value = freq
      osc.detune.value = detuneCents[i]
      const oscGain = ctx.createGain()
      oscGain.gain.value = 0.15
      osc.connect(oscGain)
      oscGain.connect(filter)
      osc.start(time)
      osc.stop(time + duration + 0.1)
    }

    // LFO modulating filter for subtle movement
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = "sine"
    lfo.frequency.value = 0.3
    lfoGain.gain.value = 300
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start(time)
    lfo.stop(time + duration + 0.1)

    // Envelope: slow attack, sustained, slow release
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(vol * 0.18, time + 0.25)
    env.gain.setValueAtTime(vol * 0.16, time + duration - 0.3)
    env.gain.linearRampToValueAtTime(0.0001, time + duration)

    filter.connect(env)

    // Dry/wet reverb
    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    dryG.gain.value = 1 - revAmt
    wetG.gain.value = revAmt
    env.connect(dryG)
    env.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

}

// --- PLUCK: karplus-strong-like with noise burst + filter pluck ---
export function playPluckSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    // Noise burst for attack
    const noiseDur = 0.04
    const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseDur), ctx.sampleRate)
    const noiseData = noiseBuf.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 4)
    }
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noiseBuf
    const noiseBP = ctx.createBiquadFilter()
    noiseBP.type = "bandpass"
    noiseBP.frequency.value = freq * 2
    noiseBP.Q.value = 2
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(vol * 0.35, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseDur)
    noiseSrc.connect(noiseBP)
    noiseBP.connect(noiseGain)

    // Main voice: triangle + sine 2nd harmonic with fast filter close
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    osc1.type = "triangle"
    osc2.type = "sine"
    osc1.frequency.value = freq
    osc2.frequency.value = freq * 2.002
    const osc2Gain = ctx.createGain()
    osc2Gain.gain.value = 0.3

    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(8000, time)
    filter.frequency.exponentialRampToValueAtTime(600, time + 0.15)
    filter.Q.value = 2.5

    // Fast exponential decay
    const env = ctx.createGain()
    env.gain.setValueAtTime(vol * 0.45, time)
    env.gain.exponentialRampToValueAtTime(0.001, time + Math.min(duration * 0.8, 2.0))

    osc1.connect(filter)
    osc2.connect(osc2Gain)
    osc2Gain.connect(filter)
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
    osc1.start(time)
    osc2.start(time)
    noiseSrc.stop(time + noiseDur + 0.01)
    osc1.stop(time + duration + 0.1)
    osc2.stop(time + duration + 0.1)

}

// --- KEYS: FM electric piano (DX7-style bell-tone) ---
export function playKeysSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    // Carrier
    const carrier = ctx.createOscillator()
    carrier.type = "sine"
    carrier.frequency.value = freq

    // Modulator for FM bell character
    const mod = ctx.createOscillator()
    mod.type = "sine"
    mod.frequency.value = freq * 7 // High ratio for bell

    const modGain = ctx.createGain()
    // FM index decays — bright attack, mellow sustain
    modGain.gain.setValueAtTime(freq * 2.0, time)
    modGain.gain.exponentialRampToValueAtTime(freq * 0.05, time + 0.3)
    mod.connect(modGain)
    modGain.connect(carrier.frequency)

    // Secondary tone: triangle at fundamental
    const osc2 = ctx.createOscillator()
    osc2.type = "triangle"
    osc2.frequency.value = freq
    const osc2Gain = ctx.createGain()
    osc2Gain.gain.value = 0.4

    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 5000

    // Envelope: percussive attack, medium sustain
    const env = ctx.createGain()
    env.gain.setValueAtTime(vol * 0.35, time)
    env.gain.setValueAtTime(vol * 0.2, time + 0.04)
    env.gain.linearRampToValueAtTime(0.0001, time + duration)

    carrier.connect(filter)
    osc2.connect(osc2Gain)
    osc2Gain.connect(filter)
    filter.connect(env)

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
    osc2.start(time)
    carrier.stop(time + duration + 0.1)
    mod.stop(time + duration + 0.1)
    osc2.stop(time + duration + 0.1)

}

// --- STRINGS: lush ensemble with LFO vibrato ---
export function playStringsSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    const detuneCents = [-12, -6, -2, 0, +2, +6, +12]
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 3500
    filter.Q.value = 0.7

    // Vibrato LFO
    const vibrato = ctx.createOscillator()
    vibrato.type = "sine"
    vibrato.frequency.value = 4.5
    const vibratoGain = ctx.createGain()
    vibratoGain.gain.value = 3 // cents of vibrato
    vibrato.connect(vibratoGain)

    for (const cents of detuneCents) {
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.value = freq
      osc.detune.value = cents
      vibratoGain.connect(osc.detune)
      const g = ctx.createGain()
      g.gain.value = 0.09
      osc.connect(g)
      g.connect(filter)
      osc.start(time)
      osc.stop(time + duration + 0.1)
    }

    // Envelope: slow swell
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(vol * 0.16, time + 0.3)
    env.gain.setValueAtTime(vol * 0.14, time + duration - 0.2)
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

    vibrato.start(time)
    vibrato.stop(time + duration + 0.1)

}

// --- ORGAN: drawbar organ with key click and rotary sim ---
export function playOrganSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    // Drawbar harmonics with realistic ratios
    const drawbars = [
      { harmonic: 0.5, gain: 0.15 }, // sub
      { harmonic: 1,   gain: 1.0 },   // fundamental
      { harmonic: 2,   gain: 0.8 },   // octave
      { harmonic: 3,   gain: 0.55 },  // 12th
      { harmonic: 4,   gain: 0.4 },   // 2 octave
      { harmonic: 6,   gain: 0.25 },  // 19th
      { harmonic: 8,   gain: 0.15 },  // 3 octave
      { harmonic: 10,  gain: 0.08 },  // Tierce
    ]

    // Rotary speaker simulation via LFO on filter
    const rotary = ctx.createOscillator()
    rotary.type = "sine"
    rotary.frequency.value = 5.5
    const rotaryGain = ctx.createGain()
    rotaryGain.gain.value = 500
    rotary.connect(rotaryGain)

    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 4500
    filter.Q.value = 1.0
    rotaryGain.connect(filter.frequency)

    // Key click
    const clickBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.003), ctx.sampleRate)
    const clickData = clickBuf.getChannelData(0)
    for (let i = 0; i < clickData.length; i++) {
      clickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clickData.length, 8)
    }
    const clickSrc = ctx.createBufferSource()
    clickSrc.buffer = clickBuf
    const clickGain = ctx.createGain()
    clickGain.gain.setValueAtTime(vol * 0.15, time)
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.003)
    clickSrc.connect(clickGain)
    clickGain.connect(filter)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(vol * 0.13, time + 0.008)
    env.gain.setValueAtTime(vol * 0.13, time + duration - 0.08)
    env.gain.linearRampToValueAtTime(0.0001, time + duration)

    for (const drawbar of drawbars) {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.value = freq * drawbar.harmonic
      const g = ctx.createGain()
      g.gain.value = drawbar.gain
      osc.connect(g)
      g.connect(filter)
      osc.start(time)
      osc.stop(time + duration + 0.1)
    }

    filter.connect(env)

    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    dryG.gain.value = 1 - revAmt
    wetG.gain.value = revAmt
    env.connect(dryG)
    env.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

    rotary.start(time)
    rotary.stop(time + duration + 0.1)
    clickSrc.start(time)
    clickSrc.stop(time + 0.005)

}

// --- BELL: FM bell with inharmonic partials + exponential decay ---
export function playBellSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    // FM pair 1: fundamental
    const car1 = ctx.createOscillator()
    car1.type = "sine"
    car1.frequency.value = freq
    const mod1 = ctx.createOscillator()
    mod1.type = "sine"
    mod1.frequency.value = freq * 3.5 // Inharmonic ratio
    const mod1Gain = ctx.createGain()
    mod1Gain.gain.setValueAtTime(freq * 1.5, time)
    mod1Gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5)
    mod1.connect(mod1Gain)
    mod1Gain.connect(car1.frequency)

    // FM pair 2: high partial
    const car2 = ctx.createOscillator()
    car2.type = "sine"
    car2.frequency.value = freq * 2.4
    const mod2 = ctx.createOscillator()
    mod2.type = "sine"
    mod2.frequency.value = freq * 5.3
    const mod2Gain = ctx.createGain()
    mod2Gain.gain.setValueAtTime(freq * 0.8, time)
    mod2Gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.3)
    mod2.connect(mod2Gain)
    mod2Gain.connect(car2.frequency)

    const car2Gain = ctx.createGain()
    car2Gain.gain.value = 0.4

    // Pure sine body
    const body = ctx.createOscillator()
    body.type = "sine"
    body.frequency.value = freq
    const bodyGain = ctx.createGain()
    bodyGain.gain.value = 0.6

    // Envelope: fast attack, very long exponential tail
    const env = ctx.createGain()
    env.gain.setValueAtTime(vol * 0.22, time)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.95)

    car1.connect(env)
    car2.connect(car2Gain)
    car2Gain.connect(env)
    body.connect(bodyGain)
    bodyGain.connect(env)

    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    dryG.gain.value = 1 - revAmt
    wetG.gain.value = revAmt
    env.connect(dryG)
    env.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

    car1.start(time); mod1.start(time)
    car2.start(time); mod2.start(time)
    body.start(time)
    car1.stop(time + duration + 0.1); mod1.stop(time + duration + 0.1)
    car2.stop(time + duration + 0.1); mod2.stop(time + duration + 0.1)
    body.stop(time + duration + 0.1)

}

// --- BASS: sub + pulse + drive with proper low-end ---
export function playBassSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    // Sub oscillator (one octave down for low-end weight)
    const sub = ctx.createOscillator()
    sub.type = "sine"
    sub.frequency.value = Math.max(20, freq / 2) // Don't go below 20Hz

    // Main voice: square wave with saturation
    const pulse = ctx.createOscillator()
    pulse.type = "square"
    pulse.frequency.value = freq

    // Octave up for grit
    const oct = ctx.createOscillator()
    oct.type = "sawtooth"
    oct.frequency.value = freq
    const octGain = ctx.createGain()
    octGain.gain.value = 0.2

    // Filter with envelope for punch
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(800, time)
    filter.frequency.exponentialRampToValueAtTime(180, time + 0.2)
    filter.Q.value = 4

    // Distortion for warmth
    const shaper = ctx.createWaveShaper()
    shaper.curve = makeSoftClipCurve(512, 2.0)

    // Envelope: punchy attack, controlled sustain
    const env = ctx.createGain()
    env.gain.setValueAtTime(vol * 0.4, time)
    env.gain.setValueAtTime(vol * 0.28, time + 0.03)
    env.gain.linearRampToValueAtTime(0.0001, time + Math.min(duration, 2.0))

    sub.connect(filter)
    pulse.connect(filter)
    oct.connect(octGain)
    octGain.connect(filter)
    filter.connect(shaper)
    shaper.connect(env)

    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    dryG.gain.value = (1 - revAmt) * 0.7 // Bass gets less reverb
    wetG.gain.value = revAmt * 0.3
    env.connect(dryG)
    env.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

    sub.start(time); pulse.start(time); oct.start(time)
    sub.stop(time + duration + 0.1)
    pulse.stop(time + duration + 0.1)
    oct.stop(time + duration + 0.1)

}

// --- LEAD: unison saw with filter envelope ---
export function playLeadSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    const detuneCents = [-7, -3, 0, +3, +7]
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(6000, time)
    filter.frequency.exponentialRampToValueAtTime(800, time + duration * 0.6)
    filter.Q.value = 4

    // Slight portamento for expression
    for (const cents of detuneCents) {
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.value = freq
      osc.detune.value = cents
      const g = ctx.createGain()
      g.gain.value = 0.18
      osc.connect(g)
      g.connect(filter)
      osc.start(time)
      osc.stop(time + duration + 0.1)
    }

    // Envelope: snappy attack, slight decay, long sustain
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(vol * 0.28, time + 0.01)
    env.gain.setValueAtTime(vol * 0.22, time + 0.06)
    env.gain.linearRampToValueAtTime(0.0001, time + duration)

    // Saturation for presence
    const shaper = ctx.createWaveShaper()
    shaper.curve = makeSoftClipCurve(256, 1.0)

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

}

// --- BRASS: saw stack with bright attack + filter envelope ---
export function playBrassSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    const detuneCents = [-5, 0, +5]
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(200, time)
    filter.frequency.linearRampToValueAtTime(4000, time + 0.06)
    filter.frequency.linearRampToValueAtTime(1800, time + duration * 0.5)
    filter.Q.value = 2.0

    for (const cents of detuneCents) {
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.value = freq
      osc.detune.value = cents
      const g = ctx.createGain()
      g.gain.value = 0.22
      osc.connect(g)
      g.connect(filter)
      osc.start(time)
      osc.stop(time + duration + 0.1)
    }

    // Brass envelope: sharp attack, then hold
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(vol * 0.2, time + 0.04)
    env.gain.setValueAtTime(vol * 0.17, time + 0.12)
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

// --- FM: complex FM with modulator envelope ---
export function playFMSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    // Carrier
    const carrier = ctx.createOscillator()
    carrier.type = "sine"
    carrier.frequency.value = freq

    // Modulator 1: primary FM with envelope
    const mod1 = ctx.createOscillator()
    mod1.type = "sine"
    mod1.frequency.value = freq * 2
    const mod1Gain = ctx.createGain()
    mod1Gain.gain.setValueAtTime(freq * 3.0, time)
    mod1Gain.gain.exponentialRampToValueAtTime(freq * 0.1, time + duration * 0.4)
    mod1.connect(mod1Gain)
    mod1Gain.connect(carrier.frequency)

    // Modulator 2: adds metallic shimmer (modulates the modulator)
    const mod2 = ctx.createOscillator()
    mod2.type = "sine"
    mod2.frequency.value = freq * 7
    const mod2Gain = ctx.createGain()
    mod2Gain.gain.setValueAtTime(freq * 0.8, time)
    mod2Gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.2)
    mod2.connect(mod2Gain)
    mod2Gain.connect(mod1.frequency)

    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 8000

    // Envelope: percussive
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(vol * 0.28, time + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    carrier.connect(filter)
    filter.connect(env)

    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    dryG.gain.value = 1 - revAmt
    wetG.gain.value = revAmt
    env.connect(dryG)
    env.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

    carrier.start(time); mod1.start(time); mod2.start(time)
    carrier.stop(time + duration + 0.1)
    mod1.stop(time + duration + 0.1)
    mod2.stop(time + duration + 0.1)

}

// --- SUPERSAW: 9 detuned saws with wide filter + chorus LFO ---
export function playSupersawSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number) {
  patchContextForCleanup(ctx)
    const detuneCents = [-20, -14, -8, -3, 0, +3, +8, +14, +20]
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(6000, time)
    filter.frequency.linearRampToValueAtTime(1500, time + duration * 0.5)
    filter.Q.value = 2.0

    // Chorus LFO on filter
    const chorus = ctx.createOscillator()
    chorus.type = "sine"
    chorus.frequency.value = 0.2
    const chorusGain = ctx.createGain()
    chorusGain.gain.value = 600
    chorus.connect(chorusGain)
    chorusGain.connect(filter.frequency)

    for (const cents of detuneCents) {
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.value = freq
      osc.detune.value = cents
      const g = ctx.createGain()
      g.gain.value = 0.08 // Much lower per-voice to prevent clipping
      osc.connect(g)
      g.connect(filter)
      osc.start(time)
      osc.stop(time + duration + 0.1)
    }

    // Envelope: medium attack, long sustain
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, time)
    env.gain.linearRampToValueAtTime(vol * 0.15, time + 0.06)
    env.gain.setValueAtTime(vol * 0.15, time + duration - 0.1)
    env.gain.linearRampToValueAtTime(0.0001, time + duration)

    filter.connect(env)

    // Soft clip for warmth
    const shaper = ctx.createWaveShaper()
    shaper.curve = makeSoftClipCurve(256, 0.8)
    env.connect(shaper)

    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    dryG.gain.value = 1 - revAmt
    wetG.gain.value = revAmt
    shaper.connect(dryG)
    shaper.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

    chorus.start(time)
    chorus.stop(time + duration + 0.1)

}

// --- WOBBLE: tempo-synced LFO on filter with distortion ---
export function playWobbleSynth(ctx: BaseAudioContext, dest: AudioNode, reverbSend: AudioNode, freq: number, time: number, duration: number, vol: number, revAmt: number, bpm: number) {
  patchContextForCleanup(ctx)
    // Dual oscillators for thickness
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    osc1.type = "sawtooth"
    osc2.type = "square"
    osc1.frequency.value = freq
    osc2.frequency.value = freq * 1.005

    // Filter with LFO wobble
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = 10
    filter.frequency.value = 400

    const lfo = ctx.createOscillator()
    lfo.type = "sine"
    const wobbleRate = (bpm / 60) * 2
    lfo.frequency.value = wobbleRate
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 3000
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    // Set base frequency higher so LFO sweep is wider
    filter.frequency.value = 2500

    // Highpass to remove mud
    const hp = ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 150

    // Distortion for grit
    const shaper = ctx.createWaveShaper()
    shaper.curve = makeSoftClipCurve(256, 2.5)

    // Envelope
    const env = ctx.createGain()
    env.gain.setValueAtTime(vol * 0.25, time)
    env.gain.setValueAtTime(vol * 0.25, time + duration - 0.1)
    env.gain.linearRampToValueAtTime(0.0001, time + duration)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(hp)
    hp.connect(shaper)
    shaper.connect(env)

    const dryG = ctx.createGain()
    const wetG = ctx.createGain()
    dryG.gain.value = 1 - revAmt
    wetG.gain.value = revAmt
    env.connect(dryG)
    env.connect(wetG)
    dryG.connect(dest)
    wetG.connect(reverbSend)

    osc1.start(time); osc2.start(time); lfo.start(time)
    osc1.stop(time + duration + 0.1)
    osc2.stop(time + duration + 0.1)
    lfo.stop(time + duration + 0.1)

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
    case "pad":      playPadSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "pluck":    playPluckSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "keys":     playKeysSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "strings":  playStringsSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "organ":    playOrganSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "bell":     playBellSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "bass":     playBassSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "lead":     playLeadSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "brass":    playBrassSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "fm":       playFMSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "supersaw": playSupersawSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
    case "wobble":   playWobbleSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt, bpm); break
    default:        playPadSynth(ctx, dest, reverbSend, freq, time, duration, vol, revAmt); break
  }
}

// Re-export helpers for offline context
export { getNoiseBuffer, invalidateNoiseBuffer, makeSoftClipCurve }