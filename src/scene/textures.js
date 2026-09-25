// Procedural canvas textures — no external image assets are loaded.
import * as THREE from 'three'

const cache = new Map()
const FONT = '"Inter", "Segoe UI", Arial, sans-serif'

function memo(key, fn) {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key)
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// deterministic PRNG so textures are identical on every load
export function rng(seed = 1) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

function toTexture(canvas, { repeat = [1, 1], srgb = true, aniso = 8, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(canvas)
  if (wrap) {
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
  }
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = aniso
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

function speckle(ctx, w, h, count, rand, colors, sizeMin, sizeMax, alpha) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.4 + rand() * 0.6)
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)]
    const s = sizeMin + rand() * (sizeMax - sizeMin)
    ctx.fillRect(rand() * w, rand() * h, s, s)
  }
  ctx.globalAlpha = 1
}

function blotches(ctx, w, h, count, rand, colors, rMin, rMax, alpha) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w
    const y = rand() * h
    const r = rMin + rand() * (rMax - rMin)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const c = colors[Math.floor(rand() * colors.length)]
    g.addColorStop(0, c)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = alpha * (0.4 + rand() * 0.6)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
    // wrap-around copies keep the texture tileable
    for (const [dx, dy] of [[w, 0], [-w, 0], [0, h], [0, -h]]) {
      if ((dx && (x + dx - r < w && x + dx + r > 0)) || (dy && (y + dy - r < h && y + dy + r > 0))) {
        ctx.save()
        ctx.translate(dx, dy)
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
        ctx.restore()
      }
    }
  }
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------
export const concreteTexture = () =>
  memo('concrete', () => {
    const S = 1024
    const c = makeCanvas(S, S)
    const ctx = c.getContext('2d')
    const r = rng(7)
    ctx.fillStyle = '#9c9b96'
    ctx.fillRect(0, 0, S, S)
    blotches(ctx, S, S, 90, r, ['#8a8984', '#a9a8a2', '#93918a', '#b0aea7'], 40, 180, 0.35)
    blotches(ctx, S, S, 25, r, ['#7d7b75', '#858279'], 30, 90, 0.25) // stains
    speckle(ctx, S, S, 26000, r, ['#7f7e79', '#b5b4ae', '#6f6e69', '#c2c0b9'], 1, 2.2, 0.35)
    // hairline cracks
    ctx.strokeStyle = 'rgba(70,68,64,0.35)'
    ctx.lineWidth = 1
    for (let i = 0; i < 7; i++) {
      let x = r() * S
      let y = r() * S
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let k = 0; k < 14; k++) {
        x += (r() - 0.5) * 40
        y += (r() - 0.5) * 40
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // saw-cut control joints at tile edges
    ctx.fillStyle = 'rgba(60,58,55,0.55)'
    ctx.fillRect(0, 0, S, 3)
    ctx.fillRect(0, 0, 3, S)
    return c
  })

export function makeConcrete(repeat) {
  return toTexture(concreteTexture(), { repeat })
}

export const epoxyTexture = (repeat) =>
  toTexture(
    memo('epoxy', () => {
      const S = 512
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      const r = rng(11)
      ctx.fillStyle = '#6f7f76'
      ctx.fillRect(0, 0, S, S)
      blotches(ctx, S, S, 40, r, ['#65756c', '#7a8a80', '#6a7a70'], 30, 120, 0.4)
      speckle(ctx, S, S, 5000, r, ['#5d6c63', '#86968c'], 1, 2, 0.25)
      ctx.fillStyle = 'rgba(40,48,44,0.5)'
      ctx.fillRect(0, 0, S, 2)
      ctx.fillRect(0, 0, 2, S)
      return c
    }),
    { repeat },
  )

export const corrugatedTexture = (repeat, base = '#8f99a3') =>
  toTexture(
    memo('corr' + base, () => {
      const W = 256
      const H = 64
      const c = makeCanvas(W, H)
      const ctx = c.getContext('2d')
      const col = new THREE.Color(base)
      for (let x = 0; x < W; x++) {
        const v = 0.78 + 0.22 * Math.sin((x / W) * Math.PI * 2 * 8)
        ctx.fillStyle = `rgb(${(col.r * 255 * v) | 0},${(col.g * 255 * v) | 0},${(col.b * 255 * v) | 0})`
        ctx.fillRect(x, 0, 1, H)
      }
      const r = rng(3)
      speckle(ctx, W, H, 600, r, ['rgba(0,0,0,0.5)', 'rgba(255,255,255,0.5)'], 1, 2, 0.12)
      return c
    }),
    { repeat },
  )

export const plasterTexture = (repeat) =>
  toTexture(
    memo('plaster', () => {
      const W = 512
      const H = 256
      const c = makeCanvas(W, H)
      const ctx = c.getContext('2d')
      const r = rng(5)
      ctx.fillStyle = '#d8d1bf'
      ctx.fillRect(0, 0, W, H)
      blotches(ctx, W, H, 50, r, ['#cfc7b3', '#e0dac9', '#c9c0aa'], 20, 90, 0.35)
      speckle(ctx, W, H, 4000, r, ['#bdb49e', '#e8e2d3'], 1, 2, 0.3)
      // grime near floor (bottom of texture)
      const g = ctx.createLinearGradient(0, H * 0.75, 0, H)
      g.addColorStop(0, 'rgba(90,80,60,0)')
      g.addColorStop(1, 'rgba(90,80,60,0.35)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      // painted skirting band
      ctx.fillStyle = '#5b6570'
      ctx.fillRect(0, H - 22, W, 22)
      return c
    }),
    { repeat },
  )

export const asphaltTexture = (repeat) =>
  toTexture(
    memo('asphalt', () => {
      const S = 512
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      const r = rng(21)
      ctx.fillStyle = '#44464a'
      ctx.fillRect(0, 0, S, S)
      blotches(ctx, S, S, 40, r, ['#3b3d41', '#4d4f53', '#404246'], 30, 120, 0.4)
      speckle(ctx, S, S, 14000, r, ['#2e3033', '#5d5f63', '#6b6d70'], 1, 2, 0.4)
      return c
    }),
    { repeat },
  )

export const grassTexture = (repeat) =>
  toTexture(
    memo('grass', () => {
      const S = 256
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      const r = rng(31)
      ctx.fillStyle = '#5d6b3c'
      ctx.fillRect(0, 0, S, S)
      blotches(ctx, S, S, 30, r, ['#6a7a44', '#52603a', '#7a7a4a'], 10, 50, 0.5)
      speckle(ctx, S, S, 5000, r, ['#4a5730', '#76874c', '#8a8a55'], 1, 2, 0.5)
      return c
    }),
    { repeat },
  )

export const woodTexture = () =>
  toTexture(
    memo('wood', () => {
      const W = 256
      const H = 64
      const c = makeCanvas(W, H)
      const ctx = c.getContext('2d')
      const r = rng(41)
      ctx.fillStyle = '#a4815a'
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = `rgba(${90 + r() * 40},${60 + r() * 30},${35 + r() * 20},${0.25 + r() * 0.3})`
        ctx.lineWidth = 0.5 + r() * 1.5
        const y = r() * H
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 8, W * 0.6, y + (r() - 0.5) * 8, W, y)
        ctx.stroke()
      }
      speckle(ctx, W, H, 300, r, ['#6d5236'], 1, 3, 0.4)
      return c
    }),
  )

export const cardboardTexture = () =>
  toTexture(
    memo('cardboard', () => {
      const S = 256
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      const r = rng(51)
      ctx.fillStyle = '#b08a5c'
      ctx.fillRect(0, 0, S, S)
      blotches(ctx, S, S, 16, r, ['#a47f52', '#bb966a'], 20, 60, 0.4)
      speckle(ctx, S, S, 2000, r, ['#8f6d45', '#c9a377'], 1, 2, 0.3)
      // tape strip
      ctx.fillStyle = 'rgba(196,170,120,0.9)'
      ctx.fillRect(S * 0.44, 0, S * 0.12, S)
      // shipping label
      ctx.fillStyle = '#f2efe6'
      ctx.fillRect(S * 0.08, S * 0.62, S * 0.3, S * 0.22)
      ctx.fillStyle = '#333'
      for (let i = 0; i < 4; i++) ctx.fillRect(S * 0.1, S * 0.65 + i * 10, S * (0.14 + r() * 0.1), 3)
      return c
    }),
    { wrap: false },
  )

export const fabricWeaveTexture = (repeat = [8, 8]) =>
  toTexture(
    memo('weave', () => {
      const S = 64
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, S, S)
      for (let y = 0; y < S; y += 2) {
        for (let x = 0; x < S; x += 2) {
          const over = ((x + y) / 2) % 2 === 0
          ctx.fillStyle = over ? '#f0f0f0' : '#d6d6d6'
          ctx.fillRect(x, y, 2, 2)
        }
      }
      return c
    }),
    { repeat },
  )

export const rollSideTexture = () =>
  toTexture(
    memo('rollside', () => {
      const S = 128
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, S, S)
      for (let rr = 6; rr < S / 2; rr += 2.2) {
        ctx.strokeStyle = `rgba(0,0,0,${0.07 + ((rr * 13) % 7) / 100})`
        ctx.beginPath()
        ctx.arc(S / 2, S / 2, rr, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillStyle = '#8b6b44'
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3a2c1c'
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S * 0.07, 0, Math.PI * 2)
      ctx.fill()
      return c
    }),
    { wrap: false },
  )

export const threadsTexture = (repeat = [1, 1], color = '#ffffff', density = 256) =>
  toTexture(
    memo('threads' + color + density, () => {
      const W = density
      const H = 8
      const c = makeCanvas(W, H)
      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      for (let x = 0; x < W; x += 2) {
        ctx.fillStyle = color
        ctx.globalAlpha = 0.55 + ((x * 7) % 5) / 12
        ctx.fillRect(x, 0, 1, H)
      }
      ctx.globalAlpha = 1
      return c
    }),
    { repeat },
  )

export const gratingTexture = (repeat) =>
  toTexture(
    memo('grating', () => {
      const S = 64
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#1b1d20'
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = '#6d7277'
      for (let x = 0; x < S; x += 8) ctx.fillRect(x, 0, 3, S)
      ctx.fillStyle = '#585c61'
      for (let y = 0; y < S; y += 32) ctx.fillRect(0, y, S, 3)
      return c
    }),
    { repeat },
  )

export const hazardTexture = (repeat = [4, 1]) =>
  toTexture(
    memo('hazard', () => {
      const S = 64
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#e3b21c'
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = '#1d1d1d'
      for (let i = -S; i < S * 2; i += 32) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + 16, 0)
        ctx.lineTo(i + 16 + S, S)
        ctx.lineTo(i + S, S)
        ctx.closePath()
        ctx.fill()
      }
      return c
    }),
    { repeat },
  )

export const tileTexture = (repeat) =>
  toTexture(
    memo('tile', () => {
      const S = 256
      const c = makeCanvas(S, S)
      const ctx = c.getContext('2d')
      const r = rng(61)
      ctx.fillStyle = '#d9d6cf'
      ctx.fillRect(0, 0, S, S)
      blotches(ctx, S, S, 20, r, ['#d2cfc7', '#e2dfd8'], 20, 60, 0.4)
      speckle(ctx, S, S, 1600, r, ['#c4c0b7', '#ebe8e1'], 1, 2, 0.3)
      ctx.fillStyle = '#b7b2a8'
      ctx.fillRect(0, 0, S, 2)
      ctx.fillRect(0, 0, 2, S)
      return c
    }),
    { repeat },
  )

// ---------------------------------------------------------------------------
// Text / sign textures
// ---------------------------------------------------------------------------
/**
 * Generic label: { width, height, bg, border, radius, lines:[{text,size,color,weight,y,align,letter}] }
 */
export function labelTexture(opts) {
  const key = 'label' + JSON.stringify(opts)
  return memo(key, () => {
    const { width = 512, height = 128, bg = '#111827', border, borderWidth = 6, radius = 12, lines = [], stripe } = opts
    const c = makeCanvas(width, height)
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    if (bg) {
      ctx.fillStyle = bg
      roundRect(ctx, 0, 0, width, height, radius)
      ctx.fill()
    }
    if (stripe) {
      ctx.fillStyle = stripe
      ctx.fillRect(0, height - Math.max(6, height * 0.06), width, Math.max(6, height * 0.06))
    }
    if (border) {
      ctx.strokeStyle = border
      ctx.lineWidth = borderWidth
      roundRect(ctx, borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth, radius)
      ctx.stroke()
    }
    for (const l of lines) {
      ctx.fillStyle = l.color || '#fff'
      ctx.font = `${l.weight || 700} ${l.size || 48}px ${FONT}`
      ctx.textAlign = l.align || 'center'
      ctx.textBaseline = 'middle'
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${l.letter || 0}px`
      const x = l.x ?? (l.align === 'left' ? 24 : l.align === 'right' ? width - 24 : width / 2)
      ctx.fillText(l.text, x, l.y ?? height / 2)
    }
    const t = toTexture(c, { wrap: false })
    return t
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export const companySignTexture = () =>
  memo('companySign', () => {
    const W = 2048
    const H = 320
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#152238')
    g.addColorStop(1, '#0c1524')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#c8962e'
    ctx.fillRect(0, 0, W, 8)
    ctx.fillRect(0, H - 8, W, 8)
    // emblem: woven square
    const ex = 150
    const ey = H / 2
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(Math.PI / 4)
    ctx.strokeStyle = '#e0b44c'
    ctx.lineWidth = 10
    ctx.strokeRect(-70, -70, 140, 140)
    ctx.lineWidth = 7
    for (let i = -40; i <= 40; i += 26) {
      ctx.beginPath()
      ctx.moveTo(-70, i)
      ctx.lineTo(70, i)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(i, -70)
      ctx.lineTo(i, 70)
      ctx.globalAlpha = 0.6
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.restore()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f3d27a'
    ctx.font = `800 132px ${FONT}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px'
    ctx.fillText('SHREE SATIJI TEXTILES', 300, H * 0.42)
    ctx.fillStyle = '#cfd6e2'
    ctx.font = `600 52px ${FONT}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = '26px'
    ctx.fillText('TEXTILE MANUFACTURING', 306, H * 0.78)
    return toTexture(c, { wrap: false })
  })

export function hmiTexture(id, status) {
  return memo('hmi' + id + status, () => {
    const W = 256
    const H = 176
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#07131d'
    ctx.fillRect(0, 0, W, H)
    const col = status === 'running' ? '#34d399' : status === 'idle' ? '#fbbf24' : '#f43f5e'
    ctx.fillStyle = '#0e2433'
    ctx.fillRect(0, 0, W, 34)
    ctx.fillStyle = '#9fd3ff'
    ctx.font = `700 22px ${FONT}`
    ctx.textBaseline = 'middle'
    ctx.fillText(id, 10, 18)
    ctx.fillStyle = col
    ctx.fillRect(W - 92, 7, 84, 22)
    ctx.fillStyle = '#04110b'
    ctx.font = `800 15px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(status === 'running' ? 'RUN' : status === 'idle' ? 'IDLE' : 'MAINT', W - 50, 19)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#6aa6c9'
    ctx.font = `600 15px ${FONT}`
    ctx.fillText('RPM', 10, 56)
    ctx.fillText('EFF', 10, 84)
    ctx.fillText('PRESS', 10, 112)
    ctx.fillStyle = '#e6f6ff'
    ctx.font = `700 20px ${FONT}`
    ctx.fillText(status === 'running' ? '650' : '0', 80, 56)
    ctx.fillText(status === 'running' ? '87%' : '--', 80, 84)
    ctx.fillText(status === 'running' ? '120 bar' : '0', 80, 112)
    // mini graph
    ctx.strokeStyle = col
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x < W - 20; x += 6) {
      const y = 150 - (status === 'running' ? 10 + Math.sin(x * 0.2) * 6 + ((x * 13) % 7) : 2)
      if (x === 0) ctx.moveTo(10 + x, y)
      else ctx.lineTo(10 + x, y)
    }
    ctx.stroke()
    return toTexture(c, { wrap: false })
  })
}

export const whiteboardTexture = () =>
  memo('whiteboard', () => {
    const W = 512
    const H = 320
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#f7f7f4'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#1e3a8a'
    ctx.font = `700 26px ${FONT}`
    ctx.fillText('PRODUCTION PLAN — SEP', 20, 40)
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(30, 280)
    ctx.lineTo(30, 70)
    ctx.moveTo(30, 280)
    ctx.lineTo(300, 280)
    ctx.stroke()
    const vals = [120, 150, 135, 170, 160, 185, 175]
    vals.forEach((v, i) => {
      ctx.fillStyle = i === vals.length - 1 ? '#dc2626' : '#2563eb'
      ctx.fillRect(45 + i * 36, 280 - v, 22, v)
    })
    ctx.fillStyle = '#111'
    ctx.font = `600 18px ${FONT}`
    ;['Target 18.5k m/day', 'Eff. goal 88%', 'WJ-05 beam chg', 'WJ-12 nozzle', 'Audit Fri'].forEach((t, i) => {
      ctx.fillText('• ' + t, 320, 90 + i * 36)
    })
    return toTexture(c, { wrap: false })
  })

export const monitorTexture = (kind = 'accounts') =>
  memo('monitor' + kind, () => {
    const W = 256
    const H = 160
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.fillStyle = kind === 'accounts' ? '#f3f6fb' : '#0f1c2b'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = kind === 'accounts' ? '#1d4ed8' : '#0ea5e9'
    ctx.fillRect(0, 0, W, 18)
    if (kind === 'accounts') {
      ctx.fillStyle = '#cbd5e1'
      for (let r = 0; r < 8; r++) ctx.fillRect(10, 28 + r * 15, W - 20, 1)
      ctx.fillStyle = '#334155'
      for (let r = 0; r < 7; r++) {
        ctx.fillRect(14, 32 + r * 15, 60, 6)
        ctx.fillRect(120, 32 + r * 15, 40, 6)
        ctx.fillRect(190, 32 + r * 15, 50, 6)
      }
    } else {
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = i === 4 ? '#fbbf24' : i === 11 ? '#f43f5e' : '#22c55e'
        ctx.fillRect(12 + (i % 6) * 40, 28 + Math.floor(i / 6) * 26, 32, 18)
      }
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = 0; x < 230; x += 10) ctx.lineTo(12 + x, 150 - 10 - Math.sin(x * 0.05) * 8 - x * 0.05)
      ctx.stroke()
    }
    return toTexture(c, { wrap: false })
  })

// ---- Safety signage ------------------------------------------------------------
export function safetySignTexture(kind) {
  return memo('sign' + kind, () => {
    const W = 256
    const H = 320
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#f7f7f2'
    ctx.fillRect(0, 0, W, H)
    ctx.lineWidth = 6
    const text = (t, color = '#111', y = 280, size = 30) => {
      ctx.fillStyle = color
      ctx.font = `800 ${size}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t, W / 2, y)
    }
    if (kind === 'caution' || kind === 'wet') {
      ctx.fillStyle = '#f1c40f'
      ctx.beginPath()
      ctx.moveTo(W / 2, 30)
      ctx.lineTo(W - 30, 220)
      ctx.lineTo(30, 220)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 10
      ctx.stroke()
      ctx.fillStyle = '#111'
      ctx.fillRect(W / 2 - 9, 90, 18, 80)
      ctx.beginPath()
      ctx.arc(W / 2, 195, 10, 0, Math.PI * 2)
      ctx.fill()
      text(kind === 'wet' ? 'WET FLOOR' : 'CAUTION', '#111', 270, 34)
    } else if (kind === 'helmet') {
      ctx.fillStyle = '#1d4ed8'
      ctx.beginPath()
      ctx.arc(W / 2, 125, 95, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(W / 2, 140, 55, Math.PI, 0)
      ctx.fill()
      ctx.fillRect(W / 2 - 75, 136, 150, 14)
      text('WEAR HELMET', '#1d4ed8', 270, 28)
    } else if (kind === 'nosmoking') {
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 18
      ctx.beginPath()
      ctx.arc(W / 2, 125, 88, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#111'
      ctx.fillRect(W / 2 - 60, 115, 100, 18)
      ctx.fillStyle = '#e67e22'
      ctx.fillRect(W / 2 + 40, 115, 18, 18)
      ctx.strokeStyle = '#dc2626'
      ctx.beginPath()
      ctx.moveTo(W / 2 - 62, 63)
      ctx.lineTo(W / 2 + 62, 187)
      ctx.stroke()
      text('NO SMOKING', '#dc2626', 270, 30)
    } else if (kind === 'fire') {
      ctx.fillStyle = '#c0392b'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#fff'
      ctx.fillRect(W / 2 - 30, 70, 60, 130)
      ctx.fillRect(W / 2 - 12, 50, 24, 24)
      ctx.fillRect(W / 2 + 12, 56, 40, 10)
      text('FIRE', '#fff', 240, 40)
      text('EXTINGUISHER', '#fff', 285, 26)
    } else if (kind === 'firstaid') {
      ctx.fillStyle = '#15803d'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#fff'
      ctx.fillRect(W / 2 - 22, 50, 44, 150)
      ctx.fillRect(W / 2 - 75, 103, 150, 44)
      text('FIRST AID', '#fff', 265, 34)
    }
    return toTexture(c, { wrap: false })
  })
}

export const exitSignTexture = () =>
  memo('exit', () => {
    const W = 256
    const H = 96
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#0f8a3c'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fff'
    ctx.font = `800 52px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('EXIT', W / 2 + 30, H / 2 + 2)
    // arrow
    ctx.beginPath()
    ctx.moveTo(20, H / 2)
    ctx.lineTo(50, H / 2 - 22)
    ctx.lineTo(50, H / 2 - 9)
    ctx.lineTo(78, H / 2 - 9)
    ctx.lineTo(78, H / 2 + 9)
    ctx.lineTo(50, H / 2 + 9)
    ctx.lineTo(50, H / 2 + 22)
    ctx.closePath()
    ctx.fill()
    return toTexture(c, { wrap: false })
  })

export const chevronTexture = () =>
  memo('chevron', () => {
    const W = 128
    const H = 128
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(20, 16)
    ctx.lineTo(70, 64)
    ctx.lineTo(20, 112)
    ctx.lineTo(48, 112)
    ctx.lineTo(98, 64)
    ctx.lineTo(48, 16)
    ctx.closePath()
    ctx.fill()
    return toTexture(c, { wrap: false, srgb: true })
  })

export const glowTexture = () =>
  memo('glow', () => {
    const S = 128
    const c = makeCanvas(S, S)
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    return toTexture(c, { wrap: false })
  })

export const beamTexture = () =>
  memo('beam', () => {
    const W = 64
    const H = 256
    const c = makeCanvas(W, H)
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(255,248,230,0.55)')
    g.addColorStop(1, 'rgba(255,248,230,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    const h = ctx.createLinearGradient(0, 0, W, 0)
    h.addColorStop(0, 'rgba(0,0,0,1)')
    h.addColorStop(0.2, 'rgba(0,0,0,0)')
    h.addColorStop(0.8, 'rgba(0,0,0,0)')
    h.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = h
    ctx.fillRect(0, 0, W, H)
    return toTexture(c, { wrap: false })
  })
