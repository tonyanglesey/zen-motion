export const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],
  [12,14],[14,16],[16,18],[16,20],[16,22],
  [11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[27,31],
  [24,26],[26,28],[28,30],[28,32]
]

export const TRAIL_LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

// Joint angle definitions: [pointA, vertex, pointB] — angle measured at vertex
export const JOINT_ANGLES = {
  'L Elbow':    [11, 13, 15],
  'R Elbow':    [12, 14, 16],
  'L Shoulder': [13, 11, 23],
  'R Shoulder': [14, 12, 24],
  'L Hip':      [11, 23, 25],
  'R Hip':      [12, 24, 26],
  'L Knee':     [23, 25, 27],
  'R Knee':     [24, 26, 28],
}

export const LANDMARK_NAMES = [
  'nose','L eye inner','L eye','L eye outer','R eye inner','R eye','R eye outer',
  'L ear','R ear','mouth L','mouth R','L shoulder','R shoulder','L elbow','R elbow',
  'L wrist','R wrist','L pinky','R pinky','L index','R index','L thumb','R thumb',
  'L hip','R hip','L knee','R knee','L ankle','R ankle','L heel','R heel',
  'L foot','R foot'
]

export const COLOR_SCHEMES = {
  cyan:    { primary: '#00e5c8', dim: 'rgba(0,229,200,0.25)', glow: 'rgba(0,229,200,0.5)', accent: '#00ffdd', bg: 'rgba(0,229,200,0.08)' },
  magenta: { primary: '#e040a0', dim: 'rgba(224,64,160,0.25)', glow: 'rgba(224,64,160,0.5)', accent: '#ff60c0', bg: 'rgba(224,64,160,0.08)' },
  gold:    { primary: '#f0c040', dim: 'rgba(240,192,64,0.25)', glow: 'rgba(240,192,64,0.5)', accent: '#ffe060', bg: 'rgba(240,192,64,0.08)' },
  blue:    { primary: '#40a0ff', dim: 'rgba(64,160,255,0.25)', glow: 'rgba(64,160,255,0.5)', accent: '#60c0ff', bg: 'rgba(64,160,255,0.08)' },
  ember:   { primary: '#ff6040', dim: 'rgba(255,96,64,0.25)', glow: 'rgba(255,96,64,0.5)', accent: '#ff8060', bg: 'rgba(255,96,64,0.08)' },
  mono:    { primary: '#ffffff', dim: 'rgba(255,255,255,0.15)', glow: 'rgba(255,255,255,0.3)', accent: '#cccccc', bg: 'rgba(255,255,255,0.05)' },
}

export const DEFAULT_SETTINGS = {
  skeleton: true,
  keypoints: true,
  labels: true,
  trails: true,
  bbox: false,
  scanlines: true,
  angles: true,
  velocity: false,
  trailLength: 12,
  pointSize: 4,
  lineWidth: 1.5,
  labelOffset: 28000,
  colorScheme: 'cyan',
}
