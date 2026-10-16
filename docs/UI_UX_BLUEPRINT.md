# asanHire — Master UI/UX Design System & Architectural Blueprint

**Version:** 2.0.0  
**Design Philosophy:** *Frozen Mist Neumorphic Dark* &bull; *AI Recommends, Human Decides*  
**Scope:** Production-Ready Frontend Directory Topology, Atomic Taxonomy, and Sovereign Design Standards.

---

## 1. Deep Psychological Analysis: Why UIs Become Chaotic

When software teams scale rapidly—especially when integrating complex AI workflows, multi-agent orchestrations, and real-time telemetry—interfaces and codebases tend to degrade into disorder. This degradation causes severe psychological and operational friction for both users and developers.

```
Unstructured Layouts
  ├── Cognitive Overload for Recruiters
  │     ├── Indistinguishable AI hallucinations vs. verified facts
  │     ├── Decision fatigue from chaotic visual hierarchies
  │     └── Accidental high-stakes errors (e.g. unlawful candidate rejection)
  │
  └── Cognitive Overload for Engineers
        ├── "Where does this button belong?" (Component fragmentation)
        ├── CSS collision & zombie classes (Lack of design token scoping)
        └── Fear of refactoring (Tightly-coupled, spaghetti view files)
```

### Psychological Impact on the Recruiter (End User)
1. **Decision Anxiety & Mistrust:** In high-stakes human resources operations, automated AI suggestions can trigger acute anxiety if they look authoritative but lack clear audit trails. When an interface fails to clearly distinguish between *advisory AI output* and *human sovereign control*, recruiters second-guess the system and either bypass it or blindly accept flawed recommendations.
2. **Cognitive Fatigue:** Cluttered pages with uneven visual weight force the user's brain to constantly parse where data ends and actions begin. Poor information scent and unpredictable button placements cause rapid mental exhaustion during high-volume resume reviews.

### Psychological Impact on the Developer
1. **Context Switching Exhaustion:** When components are scattered haphazardly (e.g., mixing atomic UI primitives, feature-specific modals, and raw page logic in a single directory), developers spend more time searching for code than writing features.
2. **Duplication Drift:** Without a clear Atomic Design hierarchy, engineers unwittingly create three different versions of the same button, card, or modal, each with slight variations in margin, border radius, and shadow.

---

## 2. Standardized Production Blueprint & Directory Structure

To eliminate architectural disorder, the frontend is organized using a strict **Feature-Driven Atomic Hybrid** architecture. Every asset, token, component, and hook has a single, unambiguous home.

```
frontend/
├── public/                          # Static Assets & Global Media
│   ├── brand/                       # Vector marks, logotypes, wordmarks
│   ├── icons/                       # Favicons, Apple touch icons, PWA manifests
│   └── og-image.png                 # Social share graph image
│
├── src/
│   ├── app/                         # Next.js App Router (Routing & Pages Only)
│   │   ├── layout.tsx               # Root layout, Plus Jakarta Sans font, Toaster
│   │   ├── globals.css              # Core tokens, Tailwind directives, Neumorphic shadows
│   │   ├── page.tsx                 # World-class Sovereign SaaS Landing Page
│   │   ├── login/page.tsx           # Recruiter Authentication Portal
│   │   ├── hr/                      # Recruiter Cockpit (Protected Zone)
│   │   │   ├── layout.tsx           # Persistent Navigation Sidebar wrapper
│   │   │   ├── page.tsx             # Executive Overview & Active Pipeline KPIs
│   │   │   ├── design-check/page.tsx# Living Styleguide & Neumorphic Token Audit
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx         # Job Requisitions Directory
│   │   │   │   ├── new/page.tsx     # Job Requisition & Rubric Synthesizer
│   │   │   │   └── [id]/page.tsx    # Candidate Leaderboard & Rankings
│   │   │   └── candidates/
│   │   │       └── [id]/page.tsx    # Complete Sovereign Candidate Dossier
│   │   ├── interview/
│   │   │   └── [token]/page.tsx     # Voice Screening Room & Guardian Proctor
│   │   └── jobs/
│   │       └── [id]/page.tsx        # Public Applicant Submission Form
│   │
│   ├── components/                  # Atomic & Feature Components
│   │   ├── brand/                   # Official Brand Marks
│   │   │   └── Logo.tsx             # Responsive SVG logotype & monogram
│   │   │
│   │   ├── neu/                     # Neumorphic Design System Primitives (Atoms)
│   │   │   ├── NeuButton.tsx        # Primary (cinnamon glow), secondary, ghost, danger
│   │   │   ├── NeuCard.tsx          # Raised, inset, and flat surfaces
│   │   │   ├── NeuBadge.tsx         # Status & criteria weighting tags
│   │   │   ├── NeuSidebar.tsx       # Recruiter navigation bar
│   │   │   └── NeuInput.tsx         # Sunken input fields with focus indicators
│   │   │
│   │   ├── interview/               # Candidate Screening Room (Molecules & Organisms)
│   │   │   ├── FullscreenGate.tsx   # Step 1 consent checklist & Step 2 fullscreen action
│   │   │   ├── GuardianSidebar.tsx  # Live trust score, debounced incident logs, guidance
│   │   │   ├── VoiceVisualizer.tsx  # Dynamic speech waveform feedback
│   │   │   └── VoiceTranscript.tsx  # Real-time Web Speech STT editable editor
│   │   │
│   │   ├── hr/                      # Recruiter Dossier Tools (Molecules & Organisms)
│   │   │   ├── DecisionModal.tsx    # Sovereign Hire/Hold/Reject with email preview
│   │   │   ├── ScoreOverrideForm.tsx# HR manual score adjustment & note
│   │   │   ├── ProctorTimeline.tsx  # Telemetry timeline with trust score badge
│   │   │   └── EmailPreviewBox.tsx  # Live preview of dynamic candidate notification
│   │   │
│   │   └── ui/                      # Base primitives (sonner, modals, dialogs)
│   │       ├── sonner.tsx           # Toast notification provider
│   │       └── card.tsx             # Base wrapper card
│   │
│   ├── lib/                         # Utilities, API Clients, and Types
│   │   ├── api.ts                   # Strongly-typed backend contract & mock fallbacks
│   │   ├── types.ts                 # TypeScript interfaces (Job, Candidate, Rubric)
│   │   ├── utils.ts                 # cn() class merging utility (clsx + tailwind-merge)
│   │   └── supabase/                # Auth & session clients
│   │       ├── client.ts            # Browser client
│   │       └── server.ts            # Server-side auth helper
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useGuardian.ts           # Debounced anti-cheat telemetry listener
│   │   ├── useSpeechRecognition.ts  # Web Speech STT transcription
│   │   └── useSpeechSynthesis.ts    # Web Speech TTS question speaker
│   │
│   ├── styles/                      # Token specifications & theme definitions
│   │   └── tokens.ts                # Hex codes, shadows, transitions, spacing constants
│   │
│   ├── postcss.config.js            # PostCSS pipeline for Tailwind processing
│   └── tailwind.config.ts           # Neumorphic colors, shadows, and font declarations
```

---

## 3. Strict Rules & Naming Conventions

### Rule 1: The Atomic Hierarchy
1. **Atoms (`components/neu/`):** Purely presentational, reusable primitives (`NeuButton`, `NeuCard`, `NeuBadge`, `NeuInput`). Never make direct API requests inside an atom.
2. **Molecules (`components/interview/`, `components/hr/`):** Combinations of atoms with local interactive state (`FullscreenGate`, `ScoreOverrideForm`, `GuardianSidebar`).
3. **Organisms & Templates:** High-level layouts combining molecules (`DecisionModal`, `CandidateDossier`).
4. **Pages (`app/**/page.tsx`):** Route controllers responsible for data fetching, parameter parsing, and top-level layout composition.

### Rule 2: Neumorphic Styling Standard (Frozen Mist Dark)
- **Canvas / Background:** `#1E201E`
- **Surface / Cards:** `#2A2D2A`
- **Raised Lift (`.neu-raised`):** `box-shadow: 6px 6px 12px #151715, -6px -6px 12px #272927;`
- **Sunken Depth (`.neu-inset`):** `box-shadow: inset 4px 4px 8px #151715, inset -4px -4px 8px #272927;`
- **Cinnamon Primary Accent:** `#DD700B` with ambient glow `0 4px 14px rgba(221, 112, 11, 0.4)`
- **Focus Ring:** Mandatory `outline: 2px solid #DD700B; outline-offset: 2px;` on all interactive controls.

### Rule 3: Component File Naming
- Components: `PascalCase.tsx` (e.g., `DecisionModal.tsx`, `NeuButton.tsx`).
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useGuardian.ts`).
- Utility modules: `kebab-case.ts` or `camelCase.ts` (e.g., `api.ts`, `tokens.ts`).

---

## 4. Summary of System Implementation & Fixes

### A. CSS & Tailwind Engine Resolution
- **Issue:** Next.js was serving unstyled HTML where Tailwind utility classes (`flex`, `grid`, `items-center`, `neu-raised`) failed to compile because `postcss.config.js` was missing and Next.js cached stale chunks in `.next/cache`.
- **Fix:** 
  1. Configured `frontend/postcss.config.js` with `tailwindcss` and `autoprefixer`.
  2. Cleared stale `.next` cache.
  3. Recompiled production bundle: Static CSS bundle expanded from an empty 3.1 KB to 37.8 KB containing all utility rules and custom neumorphic tokens.

### B. World-Class SaaS Landing Page (`/`)
- Built an executive B2B presentation showcasing the core value proposition:
  - Sticky glassmorphic navigation header with live links to candidate demos and recruiter portals.
  - Monumental hero with animated status pill, cinnamon gradient headline, and platform trust metrics.
  - Interactive multi-column dashboard preview featuring live resume rubric scoring, speech waveform visualizer, and Guardian radar.
  - 4 specialized architectural cards detailing the Rubric Synthesizer, Groq Voice Room, Guardian Telemetry, and Sovereign Recruiter Desk.
  - 4-step pipeline walkthrough explaining JD ingestion to sovereign human decision.
  - The Sovereignty Guarantee manifesto highlighting strict human-in-the-loop compliance.

### C. Recruiter Overview Cockpit (`/hr`)
- Transformed the placeholder card into an executive dashboard:
  - Requisition KPIs: active roles, total candidates screened, average voice screening performance, and Guardian integrity averages.
  - Active Job Requisitions table with quick links to public application forms and leaderboard rankings.
  - Agent Tool Orchestration health monitor tracking FastMCP server, Groq Llama 3 engine, and Guardian telemetry status.
  - Direct links to candidate voice room test drives and the living styleguide.
