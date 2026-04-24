# Zen Motion — Strategy, Vision & Build Plan
> Session: Friday April 24, 2026 | Via Ventures / Zen Fitness

---

## Competitive Landscape — Muscle & Motion

**What they are:**
- 3D kinesiology education platform — pre-rendered anatomical animations
- 4 apps: Strength Training (1,200+ exercises), Anatomy, Posture, Yoga
- 2M+ downloads, 4.9/5 across 52K reviews, 300+ university partners
- SaaS: ~$89/yr individual, tiered Pro/Business for trainers
- CEU-approved courses (ACE, NASM, NSCA)

**What they don't have:**
- Video upload for personal movement analysis
- Real-time pose detection
- AI coaching feedback on YOUR movement
- Live trainer sessions
- Any dynamic, user-generated analysis

**The positioning gap:**
> *"They show you what perfect form looks like. We show you what yours actually looks like."*

M&M is the textbook. Zen Motion is the mirror.

---

## Zen Motion — Current State

Live at `zen-motion.vercel.app`

**Already built:**
- MediaPipe BlazePose — 33 keypoints, 36 FPS on video
- Full skeleton overlay with motion trails
- Bilateral joint angle tracking — L/R elbow, shoulder, hip, knee
- Color-coded threshold flagging — red/orange = out of range, teal = good
- Avg velocity per frame
- Frame scrubbing + playback speed (0.25x, 0.5x, 1x, 2x)
- Render layers toggle — skeleton, keypoints, motion trails, joint angles, velocity vectors, bounding box, splines
- Capture mode
- Video file analysis (704×1280 tested)

**The color logic is already working** — threshold-based flagging means common mistake detection is 80% done. Just needs per-exercise angle ranges and aggregation.

---

## Immediate Build — Post-Analysis Feedback Report

### The Flow
```
Video analysis completes (frame count exhausted)
→ Aggregate joint angle data across all frames
→ Identify: avg angles, min/max ranges, flagged frames (red/orange)
→ Send structured payload to Claude via motion.lla.ma
→ Render coaching report below Render Layers panel
```

### Data Payload to Claude
```javascript
const analysisPayload = {
  exercise: "squat", // user-selected or auto-detected
  duration_frames: 1750,
  fps: 36,
  joints: {
    l_shoulder: { avg: 162, min: 38, max: 179, flagged_frames: 42 },
    r_shoulder: { avg: 41, min: 28, max: 89, flagged_frames: 67 },
    l_hip:      { avg: 94,  min: 52, max: 143, flagged_frames: 12 },
    r_hip:      { avg: 98,  min: 55, max: 148, flagged_frames: 8  },
    l_knee:     { avg: 112, min: 68, max: 171, flagged_frames: 23 },
    r_knee:     { avg: 118, min: 71, max: 169, flagged_frames: 11 },
  },
  avg_velocity: 5.1,
  asymmetry_detected: true
}
```

### Claude System Prompt
```javascript
const systemPrompt = `You are Zen Motion, an AI kinesiology coach. 
Analyze this movement data and return a JSON coaching report with:
- overall_score (0-100)
- summary (2-3 sentences, conversational)
- strengths (array, max 3)
- improvements (array, max 3, specific and actionable)
- priority_fix (single most important cue)
Return JSON only.`
```

### UI Component (dark terminal aesthetic)
```
┌─────────────────────────────────┐
│  MOVEMENT ANALYSIS              │
│  ─────────────────────────────  │
│  Overall Score        78 / 100  │
│                                 │
│  "Good depth and consistent     │
│   velocity. Left shoulder       │
│   compensation detected across  │
│   67 frames worth addressing."  │
│                                 │
│  STRENGTHS                      │
│  ✓ Consistent knee tracking     │
│  ✓ Hip symmetry maintained      │
│  ✓ Good descent velocity        │
│                                 │
│  IMPROVEMENTS                   │
│  → Left shoulder internally     │
│    rotating at peak load        │
│  → Right hip dropping 12° below │
│    left at bottom position      │
│  → Increase thoracic extension  │
│    through mid-range            │
│                                 │
│  PRIORITY FIX                   │
│  ⚡ Cue left shoulder external  │
│     rotation before each rep    │
└─────────────────────────────────┘
```

### Implementation Hooks
```javascript
// 1. Detect completion
if (currentFrame >= totalFrames) {
  generateAnalysisReport(collectedJointData)
}

// 2. Report generator
async function generateAnalysisReport(jointData) {
  setReportLoading(true)
  const summary = buildAnalysisSummary(jointData)
  const response = await fetch('https://motion.lla.ma/analyze', {
    method: 'POST',
    body: JSON.stringify({ data: summary, type: 'post_session' })
  })
  const report = await response.json()
  setAnalysisReport(report)
  setReportLoading(false)
}
```

---

## Claude Code Session Starter

Drop this into Claude Code when opening the Zen Motion repo:

```
Review the current Zen Motion codebase and give me:

1. Current state summary — what's built, how the pose 
   detection pipeline works, where joint angle data is 
   collected and stored

2. Where video completion is currently detected or where 
   it should be hooked

3. The data shape of joint angles being collected per frame

4. Recommended implementation plan for a post-analysis 
   feedback report that fires when the video finishes:
   - Aggregate joint angle data across all frames
   - Identify flagged/out-of-range joints and frame counts
   - Send structured payload to Claude API
   - Render a coaching report component below the 
     existing Render Layers panel
   - Match existing dark terminal UI aesthetic (teal accents, 
     monospace labels, same card style)

5. Any gotchas or refactor needs before adding this feature

Start by reading the main analyzer component and the 
joint angle calculation logic.
```

---

## Next Feature: Video Upload + Exercise-Specific Analysis

### The Flow
```
User uploads video (or records in-app)
→ MediaPipe processes frame-by-frame
→ Joint angles extracted per keyframe
→ Claude analyzes against exercise-specific thresholds
→ Timestamped coaching cues returned
```

### Feature Build Priority

| Feature | Complexity |
|---|---|
| Video upload (MP4/MOV → frame extraction) | Low |
| Frame sampling (every Nth frame, BlazePose per frame) | Low-Med |
| Keyframe detection (peak squat, top of press) | Med |
| Angle timeline chart across movement arc | Med |
| AI analysis (angle data + exercise context → Claude) | Low |
| Timestamped coaching cues | Med |

### Exercise-Specific Mode
- User selects exercise before analysis ("Romanian Deadlift", "Down Dog", "Squat")
- Unlocks exercise-specific angle thresholds
- AI coaching cues become precise vs generic
- Works for both gym movement AND yoga flows

---

## AI Trainer Vision — Live Voice + Human Escalation

### Two Modes

**AI Trainer (Always On)**
- Camera open, BlazePose tracking live
- Voice in / voice out (Web Speech API + TTS)
- Claude sees joint angle data AND conversation simultaneously
- Real-time cues mid-rep: *"Drive your knees out, you're at 14° of valgus"*
- Tracks sets, counts reps, notices fatigue patterns

**Human Trainer (On-Demand Escalation)**
- "Talk to a coach" button — live handoff
- Human trainer joins and inherits full session context
- Sees same live feed + BlazePose overlay
- Time-based billing (Clarity.fm model for fitness)

### Tech Stack
| Layer | Tech | Status |
|---|---|---|
| Pose detection | MediaPipe BlazePose | ✅ Built |
| Voice I/O | WebRTC + Web Speech API / Whisper | New |
| AI conversation | Claude via lla.ma Inference | ✅ Built |
| Pose-to-context bridge | Joint data injected per conversation turn | New |
| Human trainer video | WebRTC peer connection | New |
| Session handoff | Shared session state + trainer dashboard | New |

### Business Model
```
Free tier        → Text-based form feedback, video upload analysis
AI Trainer sub   → Live voice + pose coaching ($19-29/mo)
Human sessions   → Pay-per-session ($1-3/min or $40-80/hr)
```

---

## Founding Trainer Strategy

**Organic signal:** Trainers already reaching out asking to join.

**Target verticals:**
- Fitness / Strength
- Yoga
- Elderly / Rehab
- Nutrition
- Sports-specific (golf, tennis, running gait)

**What founding trainers get:**
- Lifetime rev-share rate locked in
- Free platform access during beta
- Co-creation credit
- Early feature input / named at launch

**Minimum trainer-side features needed:**
- Trainer profile + dashboard
- Session scheduling
- Client pose history
- Revenue split clarity
- White-label option ("Powered by Zen")

**Next action when ready:** Respond to every inbound trainer with:
> *"Actually yes — building something. You'd be one of the first coaches on the platform. Can I get 15 minutes to show you where it's headed and get your input?"*

---

## Infrastructure — motion.lla.ma

Dedicated inference endpoint for kinesiology and movement analysis.

### Endpoints
```
POST motion.lla.ma/analyze
POST motion.lla.ma/coaching-cues
POST motion.lla.ma/form-check
POST motion.lla.ma/session
POST motion.lla.ma/trainer-handoff
```

Every call carries: exercise context, joint angle payload, user history (optional), preferred model (or auto-routed). Model selection, skill injection, and response formatting handled internally.

### lla.ma Subdomain Architecture
| Endpoint | Product | Purpose |
|---|---|---|
| `motion.lla.ma` | Zen Motion | Pose analysis, coaching, form |
| `auth.lla.ma` | @lla-ma/auth | ✅ Exists |
| `data.lla.ma` | Shared data layer | Planned |
| `trade.lla.ma` | Zen Mercado | Market analysis AI |
| `api.lla.ma` | Core / public | General inference |

### MCP Server Layer
Custom MCP server between Zen Fitness and AI providers — unified skill layer:

```
Zen Fitness / Zen Motion
        ↓
  lla.ma MCP Server
  ├── skill: pose-analysis
  ├── skill: coaching-cues
  ├── skill: nutrition-advice
  ├── skill: form-correction
  ├── skill: trainer-handoff
        ↓
  Route to best model per skill
  ├── Claude  → nuanced coaching, long context
  ├── Gemini  → multimodal / video frames
  └── GPT     → fallback / specific tasks
```

**Build timing:** Between Phase 1 and Phase 2 — after Zen Motion refinement, before Zen Fitness embed.

---

## Weekend Roadmap

### Phase 1 — Refine Zen Motion
- [ ] Post-analysis feedback report (this session)
- [ ] Exercise-specific mode (user selects movement type)
- [ ] Common mistake detection (map red/orange flags to known error patterns)
- [ ] Video upload flow polish

### Phase 2 — Embed in Zen Fitness
- [ ] Zen Motion as a feature inside Zen Fitness web app
- [ ] Free trial gate → upgrade path to AI Trainer
- [ ] motion.lla.ma endpoint live

### Phase 3 — Founding Trainers
- [ ] Founding coach landing page + waitlist
- [ ] Trainer dashboard MVP
- [ ] Live session + handoff architecture
- [ ] 5-10 founding trainers onboarded (fitness, yoga, strength, elderly, nutrition)

---

## Competitive Moat Summary

| Capability | Muscle & Motion | Zen Motion |
|---|---|---|
| Pre-rendered exercise library | ✅ 1,200+ | ❌ |
| Real-time pose detection | ❌ | ✅ |
| Video upload analysis | ❌ | ✅ (building) |
| AI coaching feedback | ❌ | ✅ |
| Live voice AI trainer | ❌ | 🔜 |
| Human trainer escalation | ❌ | 🔜 |
| Bilateral asymmetry detection | ❌ | ✅ |
| Exercise-specific thresholds | ❌ | 🔜 |
| Institutional licensing | ✅ 300+ universities | 🔜 |

---

*Generated: April 24, 2026 | Via Ventures / Zen Fitness Ecosystem*
