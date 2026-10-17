# asanHire

> **AI Recommends. Human Decides.**  
> An intelligent, high-integrity AI hiring workflow and proctoring orchestration platform for modern technical recruitment.

---

## 1. Project Overview & Multi-Agent Mesh

asanHire automates repetitive candidate screening while ensuring hiring managers and recruiters retain 100% visibility, manual override power, and reversible decision-making at every stage.

### The 6 Specialized Agents
1. **Rubric Agent (Gemini 1.5):** Synthesizes unstructured job descriptions into objective, weighted evaluation criteria (summing to 100%).
2. **Resume Matcher Agent (Gemini 1.5):** Evaluates candidate PDF resumes against the rubric with prompt injection defenses and gap analysis.
3. **Scheduling Agent (Rule-based Python Code):** Auto-invites the top $N$ qualified candidates (scoring $\ge \text{min\_score}$) via transactional email at the job deadline.
4. **Live Interview Agent (Groq Llama 3.3):** Conducts conversational voice screening with ultra-low latency response times.
5. **Guardian Proctoring Agent (Rule-based Code):** Continuously monitors fullscreen adherence, tab switches, window blur, and paste events to compute a Candidate Trust Score (starts at 100%).
6. **Evaluation Supervisor Agent (Gemini):** Synthesizes interview transcripts, resume match, and proctoring telemetry into an executive evaluation report with a recommendation (Hire, Reject, Hold).

> [!NOTE]
> AI model names are environment variables (`GROQ_MODEL` and `GEMINI_MODEL`) that must be checked against each provider's current active model list (run `python scripts/list_models.py`).

---

## 2. Monorepo Structure

```
asanhire/
├── README.md                      # Complete setup, dev guide & team split
├── .gitignore                     # Git hygiene (node_modules, venv, secrets)
├── .env.example                   # Master environment template
├── docs/                          # Comprehensive technical documentation
│   ├── PRD.md                     # Product Requirements Document
│   ├── TRD.md                     # Technical Requirements Document
│   ├── SECURITY.md                # Threat model & defense-in-depth controls
│   ├── DESIGN.md                  # Frozen Mist Neumorphic Dark theme spec
│   ├── CONTRACT.md                # Complete API endpoint & schema contract
│   └── PROMPTS.md                 # Security preamble & all 4 agent prompts
├── template/                      # Reference UI template (kept untouched)
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql           # Schema, enums, tables, indexes & RLS policies
│   └── seed.sql                   # 1 demo job + 5 candidates across stages
├── frontend/                      # Next.js 14 App Router, TypeScript, Tailwind
│   ├── src/
│   │   ├── app/                   # App Router views & layouts
│   │   │   ├── layout.tsx         # Root layout with Plus Jakarta Sans
│   │   │   ├── globals.css        # CSS variables & neumorphic utility classes
│   │   │   ├── page.tsx           # Product landing page
│   │   │   ├── login/page.tsx     # HR login portal
│   │   │   ├── jobs/[id]/page.tsx # Public job & candidate application form
│   │   │   ├── interview/[token]/page.tsx # Candidate voice interview room
│   │   │   └── hr/                # HR admin views (protected)
│   │   │       ├── layout.tsx     # Tactile sidebar navigation layout
│   │   │       ├── page.tsx       # Talent overview dashboard
│   │   │       ├── jobs/page.tsx  # Job listings
│   │   │       ├── jobs/new/page.tsx # Post new job
│   │   │       ├── jobs/[id]/page.tsx # Candidate leaderboard
│   │   │       └── candidates/[id]/page.tsx # Candidate dossier & overrides
│   │   ├── components/
│   │   │   ├── neu/               # Reusable neumorphic design components
│   │   │   ├── hr/                # HR admin candidate tables, modals, timelines
│   │   │   └── interview/         # Voice room mic, proctoring & fullscreen gate
│   │   ├── lib/                   # API client, Supabase client, types, constants
│   │   └── middleware.ts          # Route protection middleware
│   ├── tailwind.config.ts         # Frozen Mist color palette & shadow tokens
│   ├── package.json               # Frontend dependencies
│   └── .env.example
└── backend/                       # FastAPI Python 3.11 backend & AI agents
    ├── app/
    │   ├── main.py                # FastAPI gateway & CORS configuration
    │   ├── core/                  # Config, JWT verify, rate limiting, LLM router
    │   ├── api/                   # Public, Interview & HR route controllers
    │   ├── agents/                # 6 agents: rubric, matcher, interview, etc.
    │   ├── services/              # Email (Resend), PDF parser, tokens, audit
    │   ├── models/schemas.py      # Pydantic v2 data models & LLM outputs
    │   ├── prompts.py             # System prompts with security preambles
    │   └── mcp_server.py          # FastMCP inspection tools
    ├── tests/                     # Security, token & score clamping test suite
    ├── requirements.txt           # Pinned Python dependencies
    ├── Dockerfile                 # Containerized deployment
    ├── render.yaml                # Render cloud deployment config
    └── .env.example
```

---

## 3. Team Ownership & Parallel Build Split

The project is structured with working stubs so both engineers can develop concurrently:

| Module / Component | Primary Owner | Description |
|---|---|---|
| **Frontend UI & Pages (`/frontend/src/app`)** | **M1 (Frontend Developer)** | Landing, job application, interview room, HR dashboard, modals, and design system. |
| **Neumorphic Component Library (`src/components/neu`)** | **M1 (Frontend Developer)** | `NeuCard`, `NeuButton`, `NeuInput`, `NeuModal`, `NeuBadge`, `NeuTable`, etc. |
| **Audio & Web Speech Client (`src/components/interview`)** | **M1 (Frontend Developer)** | Audio recording, Web Speech API integration, and proctoring event dispatchers. |
| **FastAPI Route Implementations (`/backend/app/api`)** | **M2 (AI/Backend Engineer)** | Connecting route stubs to Supabase DB and agents (replacing 501 stubs). |
| **Agent Prompt Engineering & Orchestration (`app/agents`)** | **M2 (AI/Backend Engineer)** | Gemini 1.5 chaining for Rubric/Matcher/Supervisor and Groq for Interview Agent. |
| **Proctoring Engine & Token Security (`app/services`)** | **M2 (AI/Backend Engineer)** | Hashed tokens, PDF magic byte checks, Resend emails, and Guardian score calculator. |
| **FastMCP Tools Server (`app/mcp_server.py`)** | **M2 (AI/Backend Engineer)** | Read-only candidate inspection and audit trail tools for external agent clients. |

---

## 4. Setup & Running Instructions

### 4.1 Run Backend (Port 8000)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate Python 3.11 virtual environment
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# 3. Install pinned dependencies
pip install -r requirements.txt

# 4. Copy environment configuration and supply your keys
cp .env.example .env

# 5. Discover active provider models and verify GROQ_MODEL & GEMINI_MODEL in .env
python scripts/list_models.py

# 6. Run test suite
pytest

# 7. Run provider verification scripts
python scripts/check_llm.py
python scripts/check_supabase.py

# 8. Start the FastAPI development server
uvicorn app.main:app --reload --port 8000
```
* **Interactive API Documentation:** Visit [http://localhost:8000/docs](http://localhost:8000/docs) (disabled in production unless `SHOW_DOCS_IN_PROD=true`)
* **Health Check:** Visit [http://localhost:8000/health](http://localhost:8000/health) (returns `{"status":"ok"}`)

---

### 4.2 Frontend (Port 3000)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Copy environment configuration
cp .env.example .env.local

# 4. Launch Next.js App Router development server
npm run dev
```
* **Landing Page:** [http://localhost:3000](http://localhost:3000)
* **Public Job Application:** [http://localhost:3000/jobs/11111111-1111-1111-1111-111111111111](http://localhost:3000/jobs/11111111-1111-1111-1111-111111111111)
* **Candidate Voice Interview Room:** [http://localhost:3000/interview/demo-sample-token](http://localhost:3000/interview/demo-sample-token)
* **HR Recruiter Dashboard:** [http://localhost:3000/hr](http://localhost:3000/hr)

---

## 5. Security & Threat Mitigation Summary

- **Zero Secrets in Frontend:** The client bundle contains only `NEXT_PUBLIC_` anonymous keys.
- **Service Role Isolation:** The Supabase Service Role key is strictly loaded inside the backend.
- **Hashed Interview Tokens:** Tokens are generated as 32-byte CSPRNG strings and stored as salted SHA-256 hashes.
- **Magic Byte File Validation:** Resumes must pass `%PDF-` signature verification and a 5 MB file size limit.
- **Prompt Injection Defense:** Resumes are isolated in `<untrusted_candidate_resume>` tags with a security preamble; Pydantic clamps scores to $[0.0, 100.0]$.
- **Least-Privilege Agent Tools:** AI agents have **zero** authority to mutate database status or send decision emails. All status transitions require authenticated HR clicks and are audit-logged.
