# asanHire Product Requirements Document (PRD)

---

## 1. Product Vision & Executive Summary
**asanHire** is an intelligent, high-integrity AI hiring orchestration platform that streamlines the end-to-end recruitment lifecycle from job posting to final hiring decision. 

Unlike traditional "black-box" recruitment automation tools that alienate candidates and strip recruiters of control, **asanHire** embodies a human-in-the-loop philosophy: **"AI Recommends, Human Decides."** Specialized AI agents handle repetitive, time-intensive evaluation tasks—rubric generation, resume parsing, ranked scoring, dynamic voice interviewing, and live integrity proctoring—while empowering HR professionals with 100% visibility, manual overrides at every stage, reversible decisions, and an immutable audit trail.

---

## 2. Problem Statement
1. **Recruiter Overwhelm & Cognitive Fatigue:** Tech recruiters spend 60%+ of their time triaging resumes and conducting repetitive first-round screening screens, leading to slow turnaround times and subjective evaluation.
2. **Resume Fabrication & Hallucinated Experience:** With AI-generated resumes flooding job portals, paper credentials no longer reliably indicate competency.
3. **Loss of Agency & Ethical Concerns:** Most AI recruitment tools act as autonomous gatekeepers without explainability. Hiring managers cannot explain why a candidate was rejected, creating compliance risks and applicant resentment.
4. **Interview Integrity Deficits:** Remote interviews suffer from tab-switching, unauthorized copy-pasting, second-screen assistance, and proxy test-taking.

---

## 3. Target Users & Personas

### Persona A: Sarah Jenkins – Senior Technical Recruiter (The HR User)
* **Demographics:** 32 years old, manages 12 active tech requisitions across engineering and AI.
* **Pain Points:** Drowning in 300+ resumes per role, manual coordination across Calendly/Google Meet, delayed debriefs, zero visibility into whether remote interview candidates are cheating.
* **Needs:** An automated triage engine that ranks applicants fairly against clear rubrics, automatically invites the top performers at deadline, conducts structured voice technical screenings, and gives Sarah one-click decision-making with full override power.

### Persona B: Alex Chen – Software Engineering Candidate (The Applicant)
* **Demographics:** 26 years old, full-stack engineer applying to high-growth tech firms.
* **Pain Points:** Applying into corporate "black holes" without feedback, scheduling friction across time zones, rigid multiple-choice tests that fail to assess real-world problem-solving.
* **Needs:** Frictionless application (just upload PDF), fast turnaround, a natural conversational voice interview that lets him speak to his real engineering choices, and fair proctoring without intrusive invasive spyware.

---

## 4. Goals & Non-Goals

### High-Priority Goals (Hackathon MVP Scope)
- **Zero-Latency Orchestration:** End-to-end workflow from job creation to rubric generation, application upload, auto-scheduling, voice screening, supervisor reporting, and HR decision.
- **Explainable Multi-Agent Collaboration:** Distinct, observable roles for Rubric Agent, Matcher Agent, Scheduling Agent, Interview Agent, Guardian Agent, and Evaluation Supervisor.
- **Total HR Agency:** Recruiters can override any score, revert any status (even after accept/reject), resend or revoke interview tokens, allow interview retries, and trigger report regeneration with mandatory audit logging.
- **Live Voice Screening with Guardian Proctoring:** Low-latency conversational interview room powered by Groq, coupled with passive browser event monitoring (tab switches, window blur, fullscreen exits, paste events) that computes a real-time Candidate Trust Score.
- **Aesthetic Neumorphic Dark Design System:** Distinctive "Frozen Mist" dark neumorphic UI with high contrast, tactile depth, and accessible keyboard navigation.

### Non-Goals (Out of Scope for 18-Hour Hackathon)
- Deep video facial recognition or biometric eye tracking (we log passive browser events and face absence/multi-face count indicators only; no raw video or audio streams are permanently stored).
- Full ATS bi-directional integrations (Workday, Greenhouse, Ashby).
- Automated payment processing or contractual offer generation.
- Candidate salary negotiation bots.

---

## 5. Core Workflow User Stories & Acceptance Criteria

### Flow 1: Job Requisition & Rubric Generation
* **User Story:** As an HR recruiter, I want to create a new job posting with a title, requirements, deadline, top $N$ quota, and minimum score threshold, so that the AI can establish an objective scoring rubric before candidates apply.
* **Acceptance Criteria:**
  1. HR inputs job details via `/hr/jobs/new`.
  2. System calls Rubric Agent (Gemini) which outputs a structured JSON rubric with weighted criteria summing to 100%.
  3. Rubric is persisted to `jobs.rubric` and displayed in the HR job overview.
  4. HR can review, edit, or regenerate the rubric before publishing.

### Flow 2: Candidate Application & Resume Matcher
* **User Story:** As a candidate, I want to view job details and apply by uploading my PDF resume, so that I can be evaluated fairly and objectively.
* **Acceptance Criteria:**
  1. Candidate navigates to public route `/jobs/[id]`.
  2. PDF upload verifies file signature (magic bytes `%PDF-`), enforces a 5 MB limit, and stores file in private Supabase bucket.
  3. Backend extracts resume text via `pypdf` and invokes Matcher Agent (Gemini).
  4. Matcher Agent scores the resume against the job rubric (0–100), outputs strengths, gaps, and specific criteria points.
  5. Candidate is stored in `candidates` table with status `applied` or `shortlisted` (if score $\ge$ `min_score`).

### Flow 3: Deadline Reached & Auto-Scheduling
* **User Story:** As an HR manager, I want the system to automatically invite the top $N$ qualified candidates when the deadline passes, so that scheduling happens without manual email back-and-forth.
* **Acceptance Criteria:**
  1. APScheduler checks active jobs whose `deadline` has elapsed.
  2. Scheduling Agent filters candidates where `status IN ('applied', 'shortlisted')` and `effective_score >= min_score`.
  3. Sorts by score descending, selects top $N$ candidates, and generates a cryptographically secure, expiring interview token.
  4. Sends branded invitation email via Resend with interview link `/interview/[token]`.
  5. Updates candidate status to `invited` and logs action in `email_logs` and `agent_runs`.

### Flow 4: Candidate Voice Interview & Guardian Proctoring
* **User Story:** As an invited candidate, I want to join an online interview room, verify my environment, and answer technical questions conversationally while being transparently monitored.
* **Acceptance Criteria:**
  1. Candidate accesses `/interview/[token]`. Token validity and expiration are verified.
  2. Fullscreen gate ensures candidate enters full-screen mode and grants microphone permissions before interview start.
  3. Interview Agent (Groq) delivers conversational voice questions tailored to candidate's background and job rubric.
  4. Candidate responds via microphone (speech-to-text streamed to Groq, dynamic audio response returned).
  5. Guardian Agent continuously tracks client events:
     - Tab hidden: -8 pts
     - Window blur: -3 pts
     - Fullscreen exit: -10 pts
     - Paste event: -10 pts
     - Copy event: -3 pts
     - Repeated offenses capped at 5 occurrences per type.
  6. Final Trust Score is calculated ($100 - \sum \text{penalties}$) and saved to `interviews.trust_score`.

### Flow 5: Supervisor Report & Reversible HR Decision
* **User Story:** As an HR leader, I want an executive evaluation report synthesized by an AI supervisor and complete authority to make, hold, or overturn any hiring decision.
* **Acceptance Criteria:**
  1. Evaluation Supervisor (Gemini) evaluates transcript, resume match, and guardian trust score to produce an executive report (technical, communication, cultural ratings, recommendation: Hire/Reject/Hold).
  2. Candidate detail view `/hr/candidates/[id]` highlights AI recommendations, transcript timeline, proctoring penalties, and audit log.
  3. HR can click "Hire", "Reject", or "Hold", with optional candidate notification email toggle.
  4. HR can override score, change status backwards or forwards (e.g. Reject $\to$ Shortlist or Hire $\to$ Hold) with mandatory reason.
  5. All modifications trigger an entry in `audit_logs`.

---

## 6. HR Full-Control Requirements
The core differentiator of **asanHire** is total human sovereignty:
| Capability | Action | Endpoint / Trigger | Audit Requirement |
|---|---|---|---|
| **Status Override** | Change candidate to any of the 8 statuses at any time | `POST /api/hr/candidates/{id}/override-status` | Mandatory `reason` field recorded in `audit_logs` |
| **Score Override** | Adjust resume score or interview score manually | `POST /api/hr/candidates/{id}/override-score` | Records old score, new score, and justification |
| **Manual Invite** | Force invite candidate outside top $N$ quota | `POST /api/hr/candidates/{id}/invite` | Logs manual trigger and timestamp |
| **Cancel Invite** | Revoke active interview token immediately | `POST /api/hr/candidates/{id}/cancel-invite` | Invalidates token hash; candidate cannot join |
| **Allow Retry** | Reset interview status and generate fresh token | `POST /api/hr/candidates/{id}/allow-retry` | Preserves previous attempt in audit log |
| **Regenerate Report** | Re-run Evaluation Supervisor with adjusted parameters | `POST /api/hr/candidates/{id}/regenerate-report` | Creates new revision in `evaluation_reports` |
| **Undo Decision** | Overturn accepted/rejected outcome | `POST /api/hr/candidates/{id}/decision` | Changes status, optional reversal email |

---

## 7. 18-Hour Hackathon Scope vs. Post-Hackathon Roadmap

```
+-------------------------------------------------------------------------+
|                  18-HOUR HACKATHON DELIVERABLE                          |
|                                                                         |
|  * Full Next.js 14 Frontend + FastAPI Python 3.11 Backend               |
|  * Neumorphic Dark (Frozen Mist) Theme System & Component Library       |
|  * Supabase PostgreSQL + Auth + RLS + Storage                            |
|  * FastMCP Tool Server for external inspection                          |
|  * 6 Agents: Rubric, Matcher, Scheduling, Interview, Guardian, Super    |
|  * Proctoring Engine (Tab, Blur, Fullscreen, Paste tracking + Trust)   |
|  * Full HR Override & Audit Log System                                  |
|  * Resend Email Integration with verified templates                     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                      POST-HACKATHON ROADMAP                             |
|                                                                         |
|  * WebRTC Multi-party video room with interviewer avatars               |
|  * Automated code execution sandbox (Pyodide / Docker sandboxes)        |
|  * Bi-directional ATS integrations (Greenhouse, Lever, Ashby)           |
|  * Multi-tenant Enterprise RBAC (Recruiter, Hiring Manager, Sourcer)    |
|  * AI Bias & DEI Compliance audit reports (EEOC compliance mode)        |
+-------------------------------------------------------------------------+
```

---

## 8. Success Metrics for Demo
1. **Time to Triage:** Under 5 seconds from resume PDF upload to scored rubric match.
2. **Interview Agent Latency:** Voice conversational response latency under 1.2 seconds using Groq Llama 3.3.
3. **Proctoring Precision:** 100% of simulated infractions (tab switch, exit fullscreen, copy/paste) detected and penalized according to the Trust Score formula.
4. **Override Reliability:** 100% of HR status changes audit-logged and reflected in real-time in the UI.
5. **Theme Consistency:** Complete visual adherence to the Frozen Mist Neumorphic palette across all views.

---

## 9. Risks and Fallbacks
| Risk | Probability | Impact | Mitigation / Fallback Strategy |
|---|---|---|---|
| **Groq API Rate Limits / Downtime** | Medium | High | Automatic fallback in `core/llm.py` to Gemini 1.5 Flash for conversational interview turns. |
| **PDF Extraction Corrupted / Unreadable** | Low | Medium | Multi-pass parsing in `services/pdf.py`: attempts `pypdf`, falls back to raw text extraction; flags for manual review if empty. |
| **Candidate Accidentally Closes Tab** | Medium | Medium | Token maintains `in_progress` state for 30 minutes; candidate can re-enter session without losing prior transcript. |
| **Email Delivery Delay (Resend)** | Low | Low | HR dashboard exposes direct interview link copy button so recruiter can message candidate directly via Slack or WhatsApp. |
