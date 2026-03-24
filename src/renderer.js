import { POSE_CONNECTIONS, TRAIL_LANDMARKS, JOINT_ANGLES } from './constants'

function calcAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }
  const dot = ba.x * bc.x + ba.y * bc.y
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y)
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y)
  if (magBA === 0 || magBC === 0) return 0
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
  return Math.round((Math.acos(cosAngle) * 180) / Math.PI)
}

export function computeAngles(landmarks) {
  const angles = {}
  for (const [name, [a, v, b]] of Object.entries(JOINT_ANGLES)) {
    const la = landmarks[a], lv = landmarks[v], lb = landmarks[b]
    if (la.visibility > 0.4 && lv.visibility > 0.4 && lb.visibility > 0.4) {
      angles[name] = calcAngle(la, lv, lb)
    }
  }
  return angles
}

export function computeVelocity(trailHistory, canvasW, canvasH) {
  if (trailHistory.length < 2) return 0
  const prev = trailHistory[trailHistory.length - 2]
  const curr = trailHistory[trailHistory.length - 1]
  let totalDist = 0
  let count = 0
  for (const i of TRAIL_LANDMARKS) {
    if (prev[i]?.v > 0.3 && curr[i]?.v > 0.3) {
      const dx = curr[i].x - prev[i].x
      const dy = curr[i].y - prev[i].y
      totalDist += Math.sqrt(dx * dx + dy * dy)
      count++
    }
  }
  return count > 0 ? totalDist / count : 0
}

export function renderOverlay(ctx, landmarks, settings, scheme, trailHistory, canvasW, canvasH) {
  const w = canvasW
  const h = canvasH

  if (settings.trails) {
    ctx.fillStyle = 'rgba(10, 10, 12, 0.15)'
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  if (!landmarks || landmarks.length === 0) return

  // ─── Motion trails ───
  if (settings.trails && trailHistory.length > 2) {
    for (const pi of TRAIL_LANDMARKS) {
      ctx.beginPath()
      let started = false
      for (let ti = 0; ti < trailHistory.length; ti++) {
        const pt = trailHistory[ti][pi]
        if (!pt || pt.v < 0.3) continue
        if (!started) { ctx.moveTo(pt.x, pt.y); started = true }
        else ctx.lineTo(pt.x, pt.y)
      }
      ctx.strokeStyle = scheme.dim
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  // ─── Skeleton connections ───
  if (settings.skeleton) {
    for (const [a, b] of POSE_CONNECTIONS) {
      const la = landmarks[a]
      const lb = landmarks[b]
      if (la.visibility < 0.3 || lb.visibility < 0.3) continue
      ctx.beginPath()
      ctx.moveTo(la.x * w, la.y * h)
      ctx.lineTo(lb.x * w, lb.y * h)
      ctx.strokeStyle = scheme.primary
      ctx.lineWidth = settings.lineWidth
      ctx.globalAlpha = 0.6 + Math.min(la.visibility, lb.visibility) * 0.4
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // ─── Keypoints ───
  if (settings.keypoints) {
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i]
      if (lm.visibility < 0.3) continue
      const x = lm.x * w
      const y = lm.y * h
      const size = settings.pointSize

      ctx.beginPath()
      ctx.arc(x, y, size * 2, 0, Math.PI * 2)
      ctx.fillStyle = scheme.glow
      ctx.globalAlpha = 0.15
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = scheme.primary
      ctx.fill()

      ctx.strokeStyle = scheme.dim
      ctx.lineWidth = 0.5
      ctx.strokeRect(x - size * 2.5, y - size * 2.5, size * 5, size * 5)
    }
  }

  // ─── Labels ───
  if (settings.labels) {
    const fontSize = Math.max(9, Math.round(w * 0.012))
    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`
    ctx.textBaseline = 'middle'
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i]
      if (lm.visibility < 0.4) continue
      const x = lm.x * w
      const y = lm.y * h
      const label = settings.labelOffset + Math.round(lm.x * 999 + lm.y * 999 + i * 3)
      ctx.fillStyle = scheme.primary
      ctx.globalAlpha = 0.55
      ctx.fillText(label, x + settings.pointSize * 3, y - 2)
      ctx.globalAlpha = 1
    }
  }

  // ─── Joint angles ───
  if (settings.angles) {
    const angles = computeAngles(landmarks)
    const fontSize = Math.max(11, Math.round(w * 0.014))
    ctx.font = `500 ${fontSize}px 'JetBrains Mono', monospace`
    ctx.textBaseline = 'middle'

    for (const [name, [a, v, b]] of Object.entries(JOINT_ANGLES)) {
      if (!(name in angles)) continue
      const lv = landmarks[v]
      const x = lv.x * w
      const y = lv.y * h
      const deg = angles[name]
      const text = `${deg}°`

      // Background pill
      const tw = ctx.measureText(text).width
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.roundRect(x - tw / 2 - 6, y - fontSize / 2 - 14, tw + 12, fontSize + 6, 3)
      ctx.fill()

      // Angle text
      ctx.fillStyle = deg < 45 || deg > 170 ? '#ff6040' : scheme.accent
      ctx.textAlign = 'center'
      ctx.fillText(text, x, y - 11)
      ctx.textAlign = 'left'
    }
  }

  // ─── Velocity indicators ───
  if (settings.velocity && trailHistory.length >= 2) {
    const prev = trailHistory[trailHistory.length - 2]
    const curr = trailHistory[trailHistory.length - 1]
    for (const i of [15, 16, 27, 28]) { // wrists and ankles
      if (!prev[i] || !curr[i] || prev[i].v < 0.3 || curr[i].v < 0.3) continue
      const dx = curr[i].x - prev[i].x
      const dy = curr[i].y - prev[i].y
      const speed = Math.sqrt(dx * dx + dy * dy)
      if (speed < 2) continue

      // Velocity vector line
      const scale = Math.min(speed * 0.8, 40)
      const nx = dx / speed
      const ny = dy / speed
      ctx.beginPath()
      ctx.moveTo(curr[i].x, curr[i].y)
      ctx.lineTo(curr[i].x + nx * scale, curr[i].y + ny * scale)
      ctx.strokeStyle = scheme.accent
      ctx.lineWidth = 2
      ctx.globalAlpha = Math.min(speed / 20, 1)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Speed value
      const fontSize = Math.max(8, Math.round(w * 0.01))
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`
      ctx.fillStyle = scheme.accent
      ctx.globalAlpha = 0.7
      ctx.fillText(`${speed.toFixed(0)}px/f`, curr[i].x + nx * scale + 4, curr[i].y + ny * scale)
      ctx.globalAlpha = 1
    }
  }

  // ─── Bounding box ───
  if (settings.bbox) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const lm of landmarks) {
      if (lm.visibility < 0.3) continue
      minX = Math.min(minX, lm.x * w)
      minY = Math.min(minY, lm.y * h)
      maxX = Math.max(maxX, lm.x * w)
      maxY = Math.max(maxY, lm.y * h)
    }
    const pad = 20
    ctx.strokeStyle = scheme.dim
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2)
    ctx.setLineDash([])
  }
}
