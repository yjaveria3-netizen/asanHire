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
  - Body: `{ "title": str, "department": str, "description": str, "requirements": str, "top_n": int, "min_score": float, "deadline": str }`
* `GET /api/hr/jobs/{job_id}`: Get job details including candidate count and rubric.

---

### 4.2 Candidate Management & Ranking
* `GET /api/hr/jobs/{job_id}/candidates`: Get ranked candidate list for a specific job.
* `GET /api/hr/candidates/{candidate_id}`: Full candidate dossier (resume, feedback, transcript, proctoring log, supervisor report, audit trail).

---

### 4.3 HR Full-Control & Override Endpoints

#### Override Candidate Status
* `POST /api/hr/candidates/{candidate_id}/override-status`
* Request Body:
```json
{
  "status": "shortlisted",
  "reason": "Candidate has specialized domain knowledge in LangChain not initially captured by parser."
}
```
* Response: `{ "success": true, "candidate_id": "...", "status": "shortlisted" }`

#### Override Candidate Score
* `POST /api/hr/candidates/{candidate_id}/override-score`
* Request Body:
```json
{
  "manual_score": 88.5,
  "reason": "Recruiter manual review of GitHub portfolio confirmed advanced distributed systems expertise."
}
```

#### Manual Interview Invitation / Resend
* `POST /api/hr/candidates/{candidate_id}/invite`
* Request Body: `{ "send_email": true }`
* Generates fresh interview token and dispatches email via Resend.

#### Cancel Active Interview Invitation
* `POST /api/hr/candidates/{candidate_id}/cancel-invite`
* Request Body: `{ "reason": "Candidate requested withdrawal from pipeline." }`

#### Allow Interview Retry
* `POST /api/hr/candidates/{candidate_id}/allow-retry`
* Request Body: `{ "reason": "Candidate experienced power outage during initial session." }`

#### Regenerate Evaluation Supervisor Report
* `POST /api/hr/candidates/{candidate_id}/regenerate-report`
* Triggers Gemini Supervisor Agent to re-evaluate transcript with updated context.

#### Final Hiring Decision
* `POST /api/hr/candidates/{candidate_id}/decision`
* Request Body:
```json
{
  "decision": "Hire",
  "send_email": true,
  "notes": "Strong unanimous recommendation."
}
```

#### Email Preview
* `GET /api/hr/candidates/{candidate_id}/email-preview?template=interview_invite`
* Returns rendered HTML/text preview of the email template before sending.

#### Audit Trail & Agent Runs
* `GET /api/hr/audit-logs?entity_id={candidate_id}`
* `GET /api/hr/agent-runs?job_id={job_id}`
