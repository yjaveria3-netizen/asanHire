# asanHire API & Schema Contract

---

## 1. Authentication & Security Schemes

| Scheme | Header / Transport | Target Endpoints | Description |
|---|---|---|---|
| **Public Rate-Limited** | Client IP (20 req/min) | `/api/public/*` | Unauthenticated public endpoints for job viewing and PDF resume submission. |
| **Interview Token** | `X-Interview-Token: <raw_token>` or URL param | `/api/interview/*` | Cryptographic 32-byte single-use token issued to candidate. |
| **Supabase HR JWT** | `Authorization: Bearer <supabase_jwt>` | `/api/hr/*` | Authenticated HR user session with job ownership enforcement. |

---

## 2. Public API Endpoints

### 2.1 Get Public Job Details
* **Method:** `GET`
* **Path:** `/api/public/jobs/{job_id}`
* **Auth:** None (Public)
* **Response (200 OK):**
```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "title": "Senior AI / Full-Stack Engineer",
  "department": "Product Engineering",
  "description": "We are seeking an experienced Full-Stack and AI Engineer...",
  "requirements": "4+ years full-stack experience (TypeScript, Next.js, FastAPI)...",
  "deadline": "2026-10-20T12:00:00Z",
  "status": "active"
}
```
* **Errors:** `404 Not Found` (if job does not exist or status is not 'active').

---

### 2.2 Submit Application & Upload Resume
* **Method:** `POST`
* **Path:** `/api/public/jobs/{job_id}/apply`
* **Auth:** None (Public, Rate Limited: 20 req/min)
* **Content-Type:** `multipart/form-data`
* **Request Form:**
  - `full_name`: string (2..100 chars)
  - `email`: string (valid email format)
  - `phone`: string (optional)
  - `resume`: binary file (max 5 MB, magic bytes `%PDF-`)
* **Response (201 Created):**
```json
{
  "candidate_id": "22222222-2222-2222-2222-222222222201",
  "status": "applied",
  "message": "Application submitted successfully. Resume evaluation is underway."
}
```
* **Errors:**
  - `400 Bad Request` (Invalid PDF magic bytes or payload > 5 MB)
  - `404 Not Found` (Job not found or closed)
  - `429 Too Many Requests` (Rate limit exceeded)

---

## 3. Interview Room Endpoints (Candidate)

### 3.1 Verify Interview Token
* **Method:** `GET`
* **Path:** `/api/interview/{raw_token}/verify`
* **Auth:** Raw Token in Path
* **Response (200 OK):**
```json
{
  "valid": true,
  "interview_id": "33333333-3333-3333-3333-333333333301",
  "candidate_name": "Amina Malik",
  "job_title": "Senior AI / Full-Stack Engineer",
  "status": "pending",
  "expires_at": "2026-10-22T12:00:00Z"
}
```
* **Errors:**
  - `403 Forbidden` (Token hash not found or invalid)
  - `410 Gone` (Token has expired or already completed)

---

### 3.2 Start Interview Session
* **Method:** `POST`
* **Path:** `/api/interview/{raw_token}/start`
* **Auth:** Raw Token
* **Response (200 OK):**
```json
{
  "interview_id": "33333333-3333-3333-3333-333333333301",
  "status": "in_progress",
  "initial_question": "Hello Amina! Welcome. Let's begin by discussing how you architect real-time voice streaming with Groq and Next.js."
}
```

---

### 3.3 Submit Answer & Get Next Question (Groq Turn)
* **Method:** `POST`
* **Path:** `/api/interview/{raw_token}/turn`
* **Auth:** Raw Token
* **Request Body:**
```json
{
  "transcript_text": "I establish a WebSocket connection directly to our FastAPI gateway...",
  "audio_duration_seconds": 14.5
}
```
* **Response (200 OK):**
```json
{
  "next_question": "Impressive. How do you handle proctoring and race conditions when multiple agent runs complete simultaneously?",
  "question_index": 2,
  "is_complete": false
}
```

---

### 3.4 Guardian Proctoring Event Telemetry
* **Method:** `POST`
* **Path:** `/api/interview/{raw_token}/guardian-event`
* **Auth:** Raw Token
* **Request Body:**
```json
{
  "event_type": "tab_hidden",
  "payload": { "duration_ms": 1400 },
  "client_timestamp": "2026-10-16T08:12:00Z"
}
```
* **Response (200 OK):**
```json
{
  "recorded": true,
  "trust_score": 92.00,
  "infraction_count": 1
}
```

---

### 3.5 Complete Interview
* **Method:** `POST`
* **Path:** `/api/interview/{raw_token}/complete`
* **Auth:** Raw Token
* **Response (200 OK):**
```json
{
  "status": "completed",
  "message": "Interview completed successfully. The hiring team has been notified."
}
```

---

## 4. HR Admin Endpoints (Authenticated)

All endpoints require `Authorization: Bearer <supabase_jwt>`.

### 4.1 Jobs Management
* `GET /api/hr/jobs`: List all jobs owned by current HR user.
* `POST /api/hr/jobs`: Create new job and invoke Rubric Agent.
  - Body: `{ "title": str, "description": str, "skills": list[str], "experience_level": str, "top_n": int, "min_score": int, "deadline": str (ISO 8601 with timezone offset or Z), "auto_invite": bool }`
* `GET /api/hr/jobs/{job_id}`: Get job details including candidate count, rubric, `deadline_at`, `server_time`, `seconds_until_deadline`, `scheduler_state`.
* `PATCH /api/hr/jobs/{job_id}`: Update job settings and deadline. Moving deadline into the future re-arms the scheduler (`scheduler_ran_at = null`). Requires strict ISO 8601 with timezone offset or Z.
* `GET /api/hr/jobs/{job_id}/progress`: Get rule-based 6-step workflow progress, counts breakdown, `next_action`, `warnings`, and scheduler timing.
* `GET /api/hr/jobs/{job_id}/delete-preview`: Returns preview counts for candidates, resume files, interviews, proctor events, reports, emails, and agent runs.
* `DELETE /api/hr/jobs/{job_id}`: Permanently deletes job. Requires body `{ "confirm_title": exact_job_title }`. Sets `status='deleting'`, deletes storage resume files with retry, cascades database rows, purges candidate audit rows, and writes a single count-only tombstone (`action='job_deleted'`).
* `POST /api/hr/jobs/{job_id}/run-scheduler`: Manually trigger the Scheduling Agent pipeline immediately.

---

### 4.2 Candidate Management & Ranking
* `GET /api/hr/jobs/{job_id}/candidates`: Get ranked candidate list for a specific job including `stage: { step: 1..6, label: str, detail: str }`.
* `GET /api/hr/candidates/{candidate_id}`: Full candidate dossier (resume, feedback, transcript, proctoring log, supervisor report, audit trail, and `stage: { step: 1..6, label: str, detail: str }`).

---

### 4.3 HR Full-Control & Override Endpoints

All override endpoints require `reason_category` (one of `'prior_experience_not_in_resume'`, `'interview_interrupted_tech_issue'`, `'disagrees_with_ai_scoring'`, `'diversity_equity_inclusion'`, `'reference_check_input'`, `'portfolio_review'`, `'other'`) and `reason` (10 to 500 characters, plain text). Every override records an entry in `hr_override_events` and writes `audit_log`.

#### Override Candidate Status
* `PATCH /api/hr/candidates/{candidate_id}/status` (or `POST /api/hr/candidates/{candidate_id}/override-status`)
* Request Body:
```json
{
  "status": "shortlisted",
  "reason": "Candidate has specialized domain knowledge in LangChain not initially captured by parser.",
  "reason_category": "prior_experience_not_in_resume"
}
```

#### Override Candidate Score
* `PATCH /api/hr/candidates/{candidate_id}/score` (or `POST /api/hr/candidates/{candidate_id}/override-score`)
* Request Body:
```json
{
  "score": 88,
  "reason": "Recruiter manual review of GitHub portfolio confirmed advanced distributed systems expertise.",
  "reason_category": "portfolio_review"
}
```

#### Manual Interview Invitation / Resend
* `POST /api/hr/candidates/{candidate_id}/invite`
* Request Body: `{ "send_email": true, "reason": "...", "reason_category": "other" }`
* If candidate score < job minimum score, `reason` (10-500 chars) and `reason_category` are mandatory, recording a `manual_invite_below_min` override.

#### Cancel Active Interview Invitation
* `POST /api/hr/candidates/{candidate_id}/cancel-invite`
* Request Body: `{ "reason": "Candidate requested withdrawal from pipeline.", "reason_category": "other" }`

#### Allow Interview Retry
* `POST /api/hr/candidates/{candidate_id}/allow-retry`
* Request Body: `{ "reason": "Candidate experienced power outage during initial session.", "reason_category": "interview_interrupted_tech_issue" }`

#### Final Hiring Decision
* `POST /api/hr/candidates/{candidate_id}/decision`
* Request Body:
```json
{
  "decision": "hired",
  "send_email": true,
  "reason": "Strong performance across technical and communication criteria.",
  "reason_category": "other"
}
```
* Note: If decision matches AI evaluation recommendation, it is treated as a normal decision. If decision differs from AI recommendation or changes an earlier decision, it is an override and enforces `reason_category` and a 10–500 char `reason`.

---

### 4.4 HR Overrides & Admin Questions
* `GET /api/hr/overrides`: List all overrides created by current HR user, including Admin status pills (`pending`, `reviewed`, `question_asked`, `answered`), questions asked by Admin, and `unanswered_questions_count`.
* `POST /api/hr/overrides/{override_id}/questions/{question_id}/answer`: Submit response to Admin inquiry (1-1000 characters). Updates `hr_override_questions`, transitions `admin_status = 'answered'`, and logs audit trail.

---

## 5. Admin Supervision Endpoints (Authenticated: Admin Role)

All admin endpoints require `Authorization: Bearer <supabase_jwt>` where the user's role in `public.user_roles` is `'admin'`. If `must_change_password = true`, all routes except `/me` and `/admin/change-password` return HTTP 403 Forbidden.

### 5.1 Identity & Password Management
* `GET /api/me` (or `GET /me`): Returns identity `{ id, email, role, must_change_password, hr_profile }`.
* `POST /api/admin/change-password`: Verifies current password with Supabase auth sign-in, enforces $\ge 12$ chars, different from current and email, updates password via Supabase Admin API, sets `must_change_password = false`, and logs `admin_audit_log`. Rate limited to 5/hour with lockout.

### 5.2 Platform Supervision & Data Views
* `GET /api/admin/overview`: Platform metrics (HR users, jobs active/closed, candidates, completed interviews, decisions, overrides this week, pending requests, emails sent today) and 14-day daily trends for applications and jobs.
* `GET /api/admin/hr-users`: List HR users with jobs count, candidates count, override rate, reply-to email and enabled flag, and last active timestamp. Sortable by `jobs`, `candidates`, `override_rate`, `last_active`.
* `GET /api/admin/hr-users/{id}`: Detailed HR account view and table of jobs created. Data Protection: Strictly excludes candidate names, resumes, scores, transcripts, and rubrics.
* `GET /api/admin/candidates/{email_key}`: Candidate platform history across all jobs, stages reached, completed interview counts, candidate portal last sign-in, and blocked status. Data Protection: Strictly excludes resume text, scores, question transcripts, and proctoring details.
* `GET /api/admin/overrides`: Paginated list of all HR overrides with filters (`hr_user_id`, `job_id`, `override_type`, `admin_status`), search, and rule-based "Worth a look" advisory flag ($\ge 5$ decisions and $> 30\%$ overrides, or same candidate overridden $> 2$ times).
* `POST /api/admin/overrides/{id}/review`: Mark override as reviewed with optional admin note ($\le 300$ chars).
* `POST /api/admin/overrides/{id}/question`: Ask HR user a question about an override (5-500 chars). Sets `admin_status = 'question_asked'`, records question, and notifies HR user via email.
