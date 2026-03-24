# Zen Motion — Kinesiology Analyzer

Real-time pose estimation and movement analysis tool that transforms any fitness video into interactive biomechanical data. Drop a workout video, loop it, study joint angles, track velocity, and capture data-art frames.

Built for the [Zen Fitness](https://zenfitness.com) ecosystem.

## Features

- **Pose Detection** — MediaPipe Pose Landmarker, 33 keypoints, runs client-side (GPU)
- **Joint Angle Analysis** — Real-time angle measurement at 8 major joints (elbows, shoulders, hips, knees)
- **Velocity Tracking** — Movement speed vectors on wrists and ankles
- **Motion Trails** — Persistent movement path visualization
- **Frame Stepping** — Pause and step forward/backward frame-by-frame
- **Playback Speed** — 0.25x, 0.5x, 1x, 2x for detailed study
- **Video Looping** — Continuous loop for repetitive movement study
- **Frame Capture** — Export composited PNG (video + overlay + watermark)
- **6 Color Schemes** — Cyan, magenta, gold, blue, ember, mono
- **Configurable Layers** — Toggle skeleton, keypoints, labels, trails, angles, velocity, bbox, scanlines

## Stack

- Vite + React (JS)
- MediaPipe Pose Landmarker (CDN, GPU-accelerated)
- Canvas 2D rendering
- Vercel deployment

## Getting Started

```bash
npm install
npm run dev
```

## Deploy

```bash
npx vercel
```

## Roadmap

- [ ] Video export (composited MP4 via MediaRecorder)
- [ ] ROM (range of motion) tracking over time
- [ ] Movement comparison (overlay two videos)
- [ ] Rep counting and form scoring
- [ ] HealthKit data overlay
- [ ] Social export presets (9:16, 1:1)
