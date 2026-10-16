import os
import sys
import time
import uuid
import threading
from datetime import datetime, timedelta, timezone
import httpx
import uvicorn

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.db import get_supabase_service_client
from scripts.generate_fixtures import generate_all_fixtures

API_BASE = os.environ.get("SMOKE_API_URL", "http://127.0.0.1:8000")


def _get_or_provision_hr_token() -> str:
    """
    Reads HR_ACCESS_TOKEN from env. If not provided, provisions/signs in a dedicated
    HR test user in Supabase Auth using an isolated client so the backend's
    service-role singleton is never mutated.
    """
    env_token = os.environ.get("HR_ACCESS_TOKEN", "").strip()
    if env_token:
        return env_token

    from supabase import create_client

    admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    smoke_email = "hr.smoke.test@asanhire.dev"
    smoke_password = "SmokeTest!Pass2026#Secure"

    try:
        admin_client.auth.admin.create_user(
            {
                "email": smoke_email,
                "password": smoke_password,
                "email_confirm": True,
            }
        )
    except Exception:
        # User already exists
        pass

    anon_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)
    auth_resp = anon_client.auth.sign_in_with_password(
        {"email": smoke_email, "password": smoke_password}
    )
    if not auth_resp or not auth_resp.session or not auth_resp.session.access_token:
        raise RuntimeError("Could not obtain HR access token from Supabase Auth.")
    return auth_resp.session.access_token


def _ensure_local_server_running() -> str:
    """
    Checks if a current local FastAPI server with /hr/jobs mounted is reachable at API_BASE;
    if not (or if an older server is bound to 8000), starts the current app on a local port.
    """
    try:
        r = httpx.get(f"{API_BASE}/hr/jobs", timeout=2.0)
        # 401 means /hr/jobs is mounted and protected by get_hr_user
        if r.status_code == 401:
            return API_BASE
    except Exception:
        pass

    import socket
    from app.main import app

    port = 8000
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(("127.0.0.1", port)) == 0:
            # Port 8000 is occupied by a stale process; bind to an available local port
            s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s2.bind(("127.0.0.1", 0))
            port = s2.getsockname()[1]
            s2.close()

    base_url = f"http://127.0.0.1:{port}"
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    for _ in range(30):
        try:
            r = httpx.get(f"{base_url}/health", timeout=1.0)
            if r.status_code == 200:
                return base_url
        except Exception:
            time.sleep(0.3)
    raise RuntimeError("Local FastAPI server failed to start.")


def main() -> None:
    print("=== asanHire End-to-End Smoke Flow ===")
    base_url = _ensure_local_server_running()
    hr_token = _get_or_provision_hr_token()
    fixtures = generate_all_fixtures()

    headers = {"Authorization": f"Bearer {hr_token}"}
    deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    with httpx.Client(base_url=base_url, timeout=90.0) as client:
        # 1. Create a job via POST /hr/jobs
        print("[1/3] Creating job via POST /hr/jobs (running Rubric Agent)...")
        job_payload = {
            "title": "Senior Full-Stack & AI Engineer",
            "description": (
                "We are looking for a Senior Full-Stack & AI Engineer to build resilient "
                "Python 3.11 FastAPI services, Next.js 14 TypeScript frontends, PostgreSQL "
                "databases with Row Level Security, and multi-agent LLM workflows."
            ),
            "skills": ["Python", "FastAPI", "TypeScript", "Next.js", "PostgreSQL", "Pytest"],
            "experience_level": "senior",
            "deadline": deadline,
            "top_n": 5,
            "min_score": 60,
            "auto_invite": True,
        }
        job_resp = client.post("/hr/jobs", json=job_payload, headers=headers)
        if job_resp.status_code != 201:
            print(f"[FAIL] Job creation failed ({job_resp.status_code}): {job_resp.text}")
            sys.exit(1)

        job_data = job_resp.json()
        job_id = job_data["id"]
        rubric_criteria_count = len((job_data.get("rubric") or {}).get("criteria", []))
        print(
            f"      Created job id={job_id} status={job_data['status']} "
            f"(rubric criteria={rubric_criteria_count})"
        )

        # 2. Apply with the 3 fixture PDFs using different test emails
        run_tag = uuid.uuid4().hex[:6]
        applicants = [
            ("Alex Chen (Strong)", f"alex.strong.{run_tag}@example.com", fixtures["strong"]),
            ("Jordan Taylor (Weak)", f"jordan.weak.{run_tag}@example.com", fixtures["weak"]),
            ("Samuel Reid (Injection)", f"sam.inject.{run_tag}@example.com", fixtures["injection"]),
        ]

        print("[2/3] Submitting 3 candidate applications via POST /public/apply...")
        for name, email, pdf_path in applicants:
            with open(pdf_path, "rb") as f:
                files = {"resume": (os.path.basename(pdf_path), f.read(), "application/pdf")}
            form_data = {
                "job_id": job_id,
                "name": name,
                "email": email,
                "consent": "true",
            }
            app_resp = client.post("/public/apply", data=form_data, files=files)
            if app_resp.status_code != 201:
                print(f"[FAIL] Application for {name} failed ({app_resp.status_code}): {app_resp.text}")
                sys.exit(1)
            app_body = app_resp.json()
            print(f"      Submitted: {name} -> status={app_body.get('status')}")

        # 3. Fetch ranked candidates via GET /hr/jobs/{id}/candidates
        print("[3/3] Fetching ranked candidates via GET /hr/jobs/{id}/candidates...")
        cand_resp = client.get(f"/hr/jobs/{job_id}/candidates", headers=headers)
        if cand_resp.status_code != 200:
            print(f"[FAIL] Fetching candidates failed ({cand_resp.status_code}): {cand_resp.text}")
            sys.exit(1)

        candidates = cand_resp.json()
        print("\n=== Ranked Candidates (Name | Score | Injection Suspected) ===")
        for idx, c in enumerate(candidates, start=1):
            print(
                f"{idx}. {c['name']} | score={c['effective_score']} | "
                f"injection_suspected={c['injection_suspected']}"
            )
        print("==============================================================")


if __name__ == "__main__":
    main()
