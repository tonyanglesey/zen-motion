const JOINT_PAIRS = [
  ['L Elbow', 'R Elbow'],
  ['L Shoulder', 'R Shoulder'],
  ['L Hip', 'R Hip'],
  ['L Knee', 'R Knee'],
]

export function detectMistakes(stats, totalFrames) {
  const patterns = []

  // Bilateral asymmetry
  for (const [left, right] of JOINT_PAIRS) {
    const l = stats[left], r = stats[right]
    if (!l || !r) continue
    const diff = Math.abs(l.avg - r.avg)
    if (diff > 20) {
      const side = l.avg < r.avg ? 'left' : 'right'
      const joint = left.replace('L ', '')
      patterns.push({
        joint,
        type: 'asymmetry',
        label: `${joint} asymmetry — ${side} side ${diff}° offset`,
        severity: diff > 35 ? 'high' : 'medium',
      })
    }
  }

  // High flag rate
  if (totalFrames > 0) {
    for (const [name, data] of Object.entries(stats)) {
      const rate = data.flagged_frames / totalFrames
      if (rate > 0.15) {
        patterns.push({
          joint: name,
          type: 'range_violation',
          label: `${name} out of range ${Math.round(rate * 100)}% of session`,
          severity: rate > 0.4 ? 'high' : 'medium',
        })
      }
    }
  }

  // Restricted range of motion
  for (const [name, data] of Object.entries(stats)) {
    const range = data.max - data.min
    if (range < 25) {
      patterns.push({
        joint: name,
        type: 'restricted_range',
        label: `${name} restricted — ${range}° range of motion`,
        severity: range < 15 ? 'high' : 'low',
      })
    }
  }

  // Hyperextension risk
  for (const [name, data] of Object.entries(stats)) {
    if (data.avg > 165) {
      patterns.push({
        joint: name,
        type: 'hyperextension',
        label: `${name} near full extension — avg ${data.avg}°`,
        severity: data.avg > 172 ? 'high' : 'medium',
      })
    }
  }

  return patterns
}
