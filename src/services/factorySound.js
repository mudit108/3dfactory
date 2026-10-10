// Procedural shop-floor sound — no audio files. Built with the Web Audio API:
//  • loom clatter: every running loom "picks" ~10–11 times a second; the
//    clicks of all looms are pre-rendered into a looping buffer
//  • motor hum (50 Hz mains + harmonics)
//  • water hiss from the jets
// Loudness follows how many looms are running and how close the camera is.

let ctx = null
let master = null
let layers = null

function noiseBuffer(ac, seconds, color = 'white') {
  const len = Math.floor(ac.sampleRate * seconds)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (color === 'brown') {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else d[i] = w
  }
  return buf
}

/** Looping buffer of loom beat-up clicks for `n` looms with slightly different speeds. */
function clatterBuffer(ac, n = 38, seconds = 4) {
  const sr = ac.sampleRate
  const len = Math.floor(sr * seconds)
  const buf = ac.createBuffer(2, len, sr)
  const L = buf.getChannelData(0)
  const R = buf.getChannelData(1)
  for (let k = 0; k < n; k++) {
    // picks per second (600–690 rpm), rounded so the loop stays seamless
    const picks = Math.round((10 + Math.random() * 1.5) * seconds)
    const period = len / picks
    const phase = Math.random() * period
    const amp = 0.25 + Math.random() * 0.35
    const pan = Math.random()
    const decay = sr * (0.004 + Math.random() * 0.004)
    const ring = 2600 + Math.random() * 1800 // metallic ring of the reed / sley
    for (let p = 0; p < picks; p++) {
      const start = Math.floor(phase + p * period + (Math.random() - 0.5) * period * 0.03)
      const a = amp * (0.8 + Math.random() * 0.4)
      for (let i = 0; i < decay * 6; i++) {
        const idx = (start + i) % len
        const env = Math.exp(-i / decay)
        const s = a * env * ((Math.random() * 2 - 1) * 0.7 + Math.sin((i / sr) * ring * Math.PI * 2) * 0.3)
        L[idx] += s * (1 - pan * 0.6)
        R[idx] += s * (0.4 + pan * 0.6)
      }
    }
  }
  // normalise
  let peak = 0
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  const g = 0.9 / (peak || 1)
  for (let i = 0; i < len; i++) {
    L[i] *= g
    R[i] *= g
  }
  return buf
}

function build() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return false
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // loom clatter
  const clatter = ctx.createBufferSource()
  clatter.buffer = clatterBuffer(ctx)
  clatter.loop = true
  const clatterLp = ctx.createBiquadFilter()
  clatterLp.type = 'lowpass'
  clatterLp.frequency.value = 5200
  const clatterGain = ctx.createGain()
  clatterGain.gain.value = 0.55
  clatter.connect(clatterLp).connect(clatterGain).connect(master)
  clatter.start()

  // motor hum
  const humGain = ctx.createGain()
  humGain.gain.value = 0.07
  for (const [f, a] of [[50, 1], [100, 0.6], [150, 0.25], [300, 0.08]]) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = a
    o.connect(g).connect(humGain)
    o.start()
  }
  const rumble = ctx.createBufferSource()
  rumble.buffer = noiseBuffer(ctx, 3, 'brown')
  rumble.loop = true
  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0.5
  rumble.connect(rumbleGain).connect(humGain)
  rumble.start()
  humGain.connect(master)

  // water hiss
  const hiss = ctx.createBufferSource()
  hiss.buffer = noiseBuffer(ctx, 3)
  hiss.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3800
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0.035
  hiss.connect(hp).connect(hissGain).connect(master)
  hiss.start()

  layers = { clatterGain, humGain, hissGain, clatterLp }
  return true
}

export const factorySound = {
  /** Must be called from a user gesture (button click). */
  async enable() {
    if (!ctx && !build()) return false
    if (ctx.state === 'suspended') await ctx.resume()
    return true
  },
  disable() {
    if (!ctx) return
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.15)
    setTimeout(() => ctx && ctx.state === 'running' && master.gain.value < 0.01 && ctx.suspend(), 800)
  },
  /**
   * @param level 0..1 overall loudness (distance / inside-outside)
   * @param running fraction of looms running 0..1
   * @param muffled true when outside the shed (walls cut the highs)
   */
  update(level, running, muffled) {
    if (!ctx || ctx.state !== 'running') return
    const t = ctx.currentTime
    master.gain.setTargetAtTime(level * 0.8, t, 0.25)
    layers.clatterGain.gain.setTargetAtTime(0.55 * running, t, 0.4)
    layers.hissGain.gain.setTargetAtTime(0.035 * running, t, 0.4)
    layers.clatterLp.frequency.setTargetAtTime(muffled ? 900 : 5200, t, 0.3)
  },
}
