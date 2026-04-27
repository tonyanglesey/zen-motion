# Zen Motion — Session Notes
> Session: April 27, 2026 | Branch: `claude/review-app-documents-mydqw`

---

## Key File Map

| File | Purpose | Key Lines |
|---|---|---|
| `src/App.jsx` | Main component — state, render loop, UI | 385 lines |
| `src/App.css` | All styling — dark theme, panel components | 553 lines |
| `src/usePoseDetection.js` | MediaPipe init + detect hook | 57 lines |
| `src/renderer.js` | Canvas drawing + angle calculation | 216 lines |
| `src/constants.js` | Joint definitions, landmark indices, color schemes | 55 lines |
| `src/main.jsx` | Entry point | 230 lines |

---

## Pose Detection

**File:** `src/usePoseDetection.js:3-23`
- BlazePose Lite, GPU delegate, VIDEO running mode
- CDN: `@mediapipe/tasks-vision@0.10.14`
- Hook exports: `init()` and `detect(videoEl, timestamp)`
- Returns `results.landmarks` array

---

## Joint Angle Data

**State:** `src/App.jsx:18`
```javascript
const [angles, setAngles] = useState({})
```

**Shape (current frame only — no history accumulated):**
```javascript
{
  'L Elbow': 127,    // integer degrees
  'R Elbow': 145,
  'L Shoulder': 89,
  'R Shoulder': 92,
  'L Hip': 78,
  'R Hip': 81,
  'L Knee': 156,
  'R Knee': 158
}
```

**Calculation:** `src/renderer.js:14-23` — `computeAngles(landmarks)`
- 3-point dot product formula, `Math.round()` to int
- Skips joint if any point has visibility < 0.4
- Called in render loop (`App.jsx:107`) and frame-step (`App.jsx:182`)

**Joint definitions:** `src/constants.js:11-21`
```javascript
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
```

---

## Video Completion Hook

**The video loops** — `loop` attribute set on `<video>` at `App.jsx:253`. No `onended` event fires.

**Loop detection block:** `App.jsx:86-92`
```javascript
if (video.currentTime < lastVideoTimeRef.current - 0.5) {
  // video looped — currently just clears trails and canvas
  trailHistoryRef.current = []
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}
lastVideoTimeRef.current = video.currentTime
```

This is the hook point for triggering the post-analysis report.

---

## UI Panel Aesthetic

**Panel component pattern:** `App.jsx:318-335`, styled in `App.css:312-376`
- Class: `.panel-section` — dark bg, 1px border, 4px radius, 20px padding
- Class: `.panel-title` — 9px, 3px letter-spacing, uppercase, dim color, bottom border
- Accent color: `#00e5c8` (cyan) with glow on active states
- Font: `JetBrains Mono` for readouts, `Outfit` for branding
- Existing panels: Joint Angles, Render Layers, Parameters, Color Scheme, Analysis/Telemetry

New coaching report panel should follow `.panel-section` + `.panel-title` pattern and slot below Render Layers.

---

## Phase 1 Build Plan — Post-Analysis Feedback Report

**Order of operations:**

1. **Frame history accumulator** — add a `useRef` in `App.jsx` to collect angle snapshots every frame. Shape:
   ```javascript
   frameHistoryRef.current.push({ frame: frameCount, angles: { ...currentAngles } })
   ```

2. **Completion trigger** — in the loop-detection block (`App.jsx:86-92`), call `generateAnalysisReport(frameHistoryRef.current)` then clear/reset history for next pass.

3. **Aggregation function** — compute per-joint: `avg`, `min`, `max`, `flagged_frames` (count where angle outside threshold).

4. **API call** — `POST motion.lla.ma/analyze` with structured payload (see strategy doc for shape).

5. **Report UI component** — new `.panel-section` below Render Layers with: overall score, summary, strengths, improvements, priority fix.

---

## Open Questions (need answers before building)

1. **Is `motion.lla.ma/analyze` live?** If not — mock response, direct Claude API call, or wait?
2. **Trigger style** — auto-fire on first loop completion, or add a manual "Stop & Analyze" button so user controls when the report runs?
3. **Exercise selector** — payload has an `exercise` field. Start with a hardcoded default or add a dropdown first?

---

*Notes captured: April 27, 2026*
