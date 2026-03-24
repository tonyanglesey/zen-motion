import { useState, useRef, useCallback } from 'react'

const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'

async function loadMediaPipe() {
  const { FilesetResolver, PoseLandmarker } = await import(
    /* @vite-ignore */
    `${CDN}/+esm`
  )
  const vision = await FilesetResolver.forVisionTasks(`${CDN}/wasm`)
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
  return landmarker
}

export function usePoseDetection() {
  const [status, setStatus] = useState('idle')
  const landmarkerRef = useRef(null)

  const init = useCallback(async () => {
    if (landmarkerRef.current) return
    setStatus('loading')
    try {
      landmarkerRef.current = await loadMediaPipe()
      setStatus('ready')
    } catch (e) {
      console.error('Pose model error:', e)
      setStatus('error')
    }
  }, [])

  const detect = useCallback((videoEl, timestamp) => {
    if (!landmarkerRef.current) {
      console.warn('[ZEN] No landmarker available')
      return null
    }
    try {
      const result = landmarkerRef.current.detectForVideo(videoEl, timestamp)
      return result
    } catch (e) {
      console.error('[ZEN] Detection error:', e)
      return null
    }
  }, [])

  return { status, init, detect }
}
