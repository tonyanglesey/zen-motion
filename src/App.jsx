import { useState, useRef, useEffect, useCallback } from 'react'
import { usePoseDetection } from './usePoseDetection'
import { renderOverlay, computeAngles, computeVelocity } from './renderer'
import { COLOR_SCHEMES, DEFAULT_SETTINGS, JOINT_ANGLES } from './constants'
import AnalysisReport from './AnalysisReport'
import { detectMistakes } from './mistakes'
import './App.css'

function buildAnalysisSummary(frameData) {
  const stats = {}
  for (const name of Object.keys(JOINT_ANGLES)) {
    const vals = frameData.map(f => f.angles[name]).filter(v => v !== undefined)
    if (vals.length === 0) continue
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    stats[name] = {
      avg,
      min: Math.min(...vals),
      max: Math.max(...vals),
      flagged_frames: vals.filter(v => v < 45 || v > 170).length,
    }
  }
  const velocities = frameData.map(f => f.velocity).filter(v => v > 0)
  const avg_velocity = velocities.length > 0
    ? parseFloat((velocities.reduce((a, b) => a + b, 0) / velocities.length).toFixed(1))
    : 0
  const pairs = [['L Shoulder', 'R Shoulder'], ['L Hip', 'R Hip'], ['L Knee', 'R Knee'], ['L Elbow', 'R Elbow']]
  const asymmetry_detected = pairs.some(
    ([l, r]) => stats[l] && stats[r] && Math.abs(stats[l].avg - stats[r].avg) > 15
  )
  const detected_patterns = detectMistakes(stats, frameData.length)
  return { exercise: 'general', duration_frames: frameData.length, fps: 36, joints: stats, avg_velocity, asymmetry_detected, detected_patterns }
}

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameCount, setFrameCount] = useState(0)
  const [fps, setFps] = useState(0)
  const [pointCount, setPointCount] = useState(0)
  const [confidence, setConfidence] = useState(0)
  const [resolution, setResolution] = useState('--')
  const [videoName, setVideoName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [angles, setAngles] = useState({})
  const [velocity, setVelocity] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [analysisReport, setAnalysisReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)
  const [detectedPatterns, setDetectedPatterns] = useState([])

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const trailHistoryRef = useRef([])
  const frameRef = useRef(0)
  const lastTimeRef = useRef(0)
  const animRef = useRef(null)
  const settingsRef = useRef(settings)
  const lastVideoTimeRef = useRef(0)
  const frameDataRef = useRef([])

  const { status: modelStatus, init: initModel, detect } = usePoseDetection()

  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { initModel() }, [initModel])

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }))
  const setParam = (key, value) => setSettings(s => ({ ...s, [key]: value }))

  const generateAnalysisReport = useCallback(async (frameData) => {
    if (frameData.length < 30) return
    setReportLoading(true)
    setAnalysisReport(null)
    setReportError(null)
    const summary = buildAnalysisSummary(frameData)
    setDetectedPatterns(summary.detected_patterns)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: summary, type: 'post_session' }),
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const report = await response.json()
      setAnalysisReport(report)
    } catch (err) {
      setReportError(err.message)
    } finally {
      setReportLoading(false)
    }
  }, [])

  // ─── File handling ───
  const loadVideo = useCallback((file) => {
    const url = URL.createObjectURL(file)
    const video = videoRef.current
    video.src = url
    setVideoName(file.name)
    video.onloadedmetadata = () => {
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      setResolution(`${video.videoWidth}×${video.videoHeight}`)
      setVideoLoaded(true)
      trailHistoryRef.current = []
      frameRef.current = 0
      setFrameCount(0)
      frameDataRef.current = []
      setAnalysisReport(null)
      setReportError(null)
      setDetectedPatterns([])
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('video/')) loadVideo(file)
  }, [loadVideo])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) loadVideo(file)
  }, [loadVideo])

  // ─── Render loop ───
  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.paused) {
      setIsPlaying(false)
      return
    }

    const now = performance.now()
    if (lastTimeRef.current) {
      setFps(Math.round(1000 / (now - lastTimeRef.current)))
    }
    lastTimeRef.current = now
    frameRef.current++
    setFrameCount(frameRef.current)

    // Detect loop boundary
    if (video.currentTime < lastVideoTimeRef.current - 0.5) {
      trailHistoryRef.current = []
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    lastVideoTimeRef.current = video.currentTime

    const results = detect(video, now)
    const ctx = canvas.getContext('2d')
    const s = settingsRef.current
    const sc = COLOR_SCHEMES[s.colorScheme]

    if (results?.landmarks?.[0]) {
      const landmarks = results.landmarks[0]
      const visibleCount = landmarks.filter(l => l.visibility > 0.3).length
      setPointCount(visibleCount)
      const avg = landmarks.reduce((sum, l) => sum + l.visibility, 0) / landmarks.length
      setConfidence(avg)

      // Compute analysis data
      const currentAngles = computeAngles(landmarks)
      setAngles(currentAngles)

      const trail = trailHistoryRef.current
      trail.push(landmarks.map(l => ({
        x: l.x * canvas.width,
        y: l.y * canvas.height,
        v: l.visibility,
      })))
      if (trail.length > s.trailLength) trail.shift()

      const currentVelocity = computeVelocity(trail, canvas.width, canvas.height)
      setVelocity(currentVelocity)
      frameDataRef.current.push({ angles: currentAngles, velocity: currentVelocity })
      renderOverlay(ctx, landmarks, s, sc, trail, canvas.width, canvas.height)
    } else {
      setPointCount(0)
      if (s.trails) {
        ctx.fillStyle = 'rgba(10, 10, 12, 0.15)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    animRef.current = requestAnimationFrame(tick)
  }, [detect])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
      cancelAnimationFrame(animRef.current)
    } else {
      video.play()
      setIsPlaying(true)
      lastTimeRef.current = 0
      animRef.current = requestAnimationFrame(tick)
    }
  }, [isPlaying, tick])

  const reset = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
    setIsPlaying(false)
    frameRef.current = 0
    setFrameCount(0)
    trailHistoryRef.current = []
    frameDataRef.current = []
    setAngles({})
    setVelocity(0)
    setAnalysisReport(null)
    setReportError(null)
    setReportLoading(false)
    setDetectedPatterns([])
    cancelAnimationFrame(animRef.current)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }, [])

  const changeSpeed = useCallback((rate) => {
    setPlaybackRate(rate)
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [])

  const stepFrame = useCallback((dir) => {
    const video = videoRef.current
    if (!video || isPlaying) return
    video.currentTime = Math.max(0, video.currentTime + dir * (1 / 30))
    // Run single detection on the stepped frame
    setTimeout(() => {
      const now = performance.now()
      const results = detect(video, now)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const s = settingsRef.current
      const sc = COLOR_SCHEMES[s.colorScheme]
      if (results?.landmarks?.[0]) {
        const landmarks = results.landmarks[0]
        setPointCount(landmarks.filter(l => l.visibility > 0.3).length)
        setAngles(computeAngles(landmarks))
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        renderOverlay(ctx, landmarks, s, sc, [], canvas.width, canvas.height)
      }
    }, 50)
  }, [isPlaying, detect])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const exp = document.createElement('canvas')
    exp.width = video.videoWidth
    exp.height = video.videoHeight
    const ectx = exp.getContext('2d')
    ectx.drawImage(video, 0, 0)
    ectx.drawImage(canvas, 0, 0)
    const fontSize = Math.round(exp.height * 0.015)
    ectx.font = `200 ${fontSize}px 'Outfit', sans-serif`
    ectx.fillStyle = 'rgba(0, 229, 200, 0.25)'
    ectx.textAlign = 'right'
    ectx.fillText('ZEN MOTION', exp.width - 20, exp.height - 20)
    const link = document.createElement('a')
    link.download = `zen-motion-${String(frameRef.current).padStart(6, '0')}.png`
    link.href = exp.toDataURL('image/png')
    link.click()
  }, [])

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handleEnded = () => {
      cancelAnimationFrame(animRef.current)
      setIsPlaying(false)
      generateAnalysisReport(frameDataRef.current)
    }
    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [generateAnalysisReport])

  const statusLabel = modelStatus === 'loading' ? 'Loading pose model...'
    : modelStatus === 'error' ? 'Model failed to load — refresh to retry'
    : modelStatus === 'ready' && !videoLoaded ? 'Model ready — drop a video to analyze'
    : modelStatus === 'ready' && videoLoaded ? `Analyzing: ${resolution} @ ${videoName}`
    : 'Initializing...'

  const angleEntries = Object.entries(angles)

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-group">
          <div className="logo">ZEN <span>MOTION</span></div>
          <div className="logo-sub">Kinesiology Analyzer</div>
        </div>
        <div className="header-stats">
          <div>FPS <span className="value">{fps || '--'}</span></div>
          <div>Points <span className="value">{pointCount || '--'}</span></div>
          <div>Frame <span className="value">{frameCount || '--'}</span></div>
          <div>Speed <span className="value">{playbackRate}x</span></div>
        </div>
      </header>

      <div className="main-layout">
        <div className="viewport-col">
          <div
            className={`viewport ${videoLoaded ? 'has-video' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {!videoLoaded && (
              <label className={`drop-zone ${dragging ? 'dragging' : ''}`}>
                <div className="drop-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
                </div>
                <div className="drop-text">Drop a movement video</div>
                <div className="drop-hint">Analyze any exercise · MP4 · MOV · WEBM</div>
                <input type="file" accept="video/*" className="file-input" onChange={handleFileSelect} />
              </label>
            )}
            <video ref={videoRef} playsInline style={{ display: videoLoaded ? 'block' : 'none' }} />
            <canvas ref={canvasRef} style={{ display: videoLoaded ? 'block' : 'none' }} />
            {videoLoaded && settings.scanlines && <div className="scanlines" />}
            {videoLoaded && (
              <div className="frame-overlay">
                <div className="big">{String(frameCount).padStart(4, '0')}</div>
                <div>FRAME</div>
              </div>
            )}
            {videoLoaded && <div className="watermark">ZEN MOTION</div>}
          </div>

          <div className="status-bar">
            <div className={`status-dot ${modelStatus === 'loading' ? 'processing' : modelStatus === 'ready' ? 'active' : ''}`} />
            <span>{statusLabel}</span>
          </div>

          <div className="playback-bar">
            <button className="btn primary" onClick={play} disabled={!videoLoaded || modelStatus !== 'ready'}>
              {isPlaying ? 'Pause' : 'Analyze'}
            </button>
            <button className="btn" onClick={() => stepFrame(-1)} disabled={!videoLoaded || isPlaying} title="Previous frame">◀</button>
            <button className="btn" onClick={() => stepFrame(1)} disabled={!videoLoaded || isPlaying} title="Next frame">▶</button>
            <button className="btn" onClick={reset} disabled={!videoLoaded}>Reset</button>
            <button className="btn" onClick={captureFrame} disabled={!videoLoaded}>Capture</button>
            <div className="speed-controls">
              {[0.25, 0.5, 1, 2].map(rate => (
                <button
                  key={rate}
                  className={`btn speed-btn ${playbackRate === rate ? 'primary' : ''}`}
                  onClick={() => changeSpeed(rate)}
                  disabled={!videoLoaded}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="controls-panel">
          {/* Joint Angles Panel */}
          {angleEntries.length > 0 && (
            <div className="panel-section">
              <div className="panel-title">Joint Angles</div>
              <div className="angles-grid">
                {angleEntries.map(([name, deg]) => (
                  <div key={name} className="angle-item">
                    <div className="angle-name">{name}</div>
                    <div className={`angle-value ${deg < 45 || deg > 170 ? 'warning' : ''}`}>{deg}°</div>
                    <div className="angle-bar-track">
                      <div className="angle-bar-fill" style={{ width: `${(deg / 180) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {velocity > 0 && (
                <div className="velocity-readout">
                  <span className="label">AVG VELOCITY</span>
                  <span className="val">{velocity.toFixed(1)} px/f</span>
                </div>
              )}
            </div>
          )}

          <div className="panel-section">
            <div className="panel-title">Render Layers</div>
            {[
              ['skeleton', 'Skeleton'],
              ['keypoints', 'Keypoints'],
              ['labels', 'Point Labels'],
              ['trails', 'Motion Trails'],
              ['angles', 'Joint Angles'],
              ['velocity', 'Velocity Vectors'],
              ['bbox', 'Bounding Box'],
              ['scanlines', 'Scanlines'],
            ].map(([key, label]) => (
              <div className="toggle-row" key={key}>
                <span className="toggle-label">{label}</span>
                <div className={`toggle ${settings[key] ? 'active' : ''}`} onClick={() => toggle(key)} />
              </div>
            ))}
          </div>

          <div className="panel-section">
            <div className="panel-title">Parameters</div>
            {[
              { key: 'trailLength', label: 'Trail Length', min: 2, max: 40, step: 1 },
              { key: 'pointSize', label: 'Point Size', min: 1, max: 12, step: 1 },
              { key: 'lineWidth', label: 'Line Width', min: 0.5, max: 5, step: 0.5 },
              { key: 'labelOffset', label: 'Label Offset', min: 10000, max: 50000, step: 1000 },
            ].map(({ key, label, min, max, step }) => (
              <div className="slider-row" key={key}>
                <div className="slider-header">
                  <span className="slider-label">{label}</span>
                  <span className="slider-value">{settings[key]}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(e) => setParam(key, +e.target.value)} />
              </div>
            ))}
          </div>

          <div className="panel-section">
            <div className="panel-title">Color Scheme</div>
            <div className="color-schemes">
              {Object.entries(COLOR_SCHEMES).map(([name, sc]) => (
                <div
                  key={name}
                  className={`color-chip ${settings.colorScheme === name ? 'active' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${sc.primary}, ${sc.dim})` }}
                  onClick={() => setParam('colorScheme', name)}
                />
              ))}
            </div>
          </div>

          <AnalysisReport report={analysisReport} loading={reportLoading} error={reportError} patterns={detectedPatterns} />

          <div className="panel-section">
            <div className="panel-title">Analysis</div>
            <div className="data-readout">
              <div><span className="label">STATUS</span> <span className="val">{isPlaying ? 'ANALYZING' : videoLoaded ? 'READY' : 'IDLE'}</span></div>
              <div><span className="label">LANDMARKS</span> <span className="val">{pointCount} / 33</span></div>
              <div><span className="label">CONFIDENCE</span> <span className="val">{confidence ? (confidence * 100).toFixed(1) + '%' : '--'}</span></div>
              <div><span className="label">RESOLUTION</span> <span className="val">{resolution}</span></div>
              <div><span className="label">FRAME</span> <span className="val">{frameCount}</span></div>
              <div><span className="label">VELOCITY</span> <span className="val magenta">{velocity.toFixed(1)} px/f</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
