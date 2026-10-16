import os
import sys
import httpx

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import get_supabase_service_client
from scripts.smoke_flow import _get_or_provision_hr_token


def _start_fresh_local_server() -> str:
    import socket
    import time
    import threading
    import uvicorn
    from app.main import app

    try:
        r = httpx.patch("http://127.0.0.1:8000/hr/candidates/test/status", timeout=1.5)
        if r.status_code == 401:
            return "http://127.0.0.1:8000"
    except Exception:
        pass

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()

    base_url = f"http://127.0.0.1:{port}"
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)
    threading.Thread(target=server.run, daemon=True).start()

    for _ in range(30):
        try:
            if httpx.get(f"{base_url}/health", timeout=1.0).status_code == 200:
                return base_url
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("Server failed to start")


def main() -> None:
    print("=== Testing HR Overrides, Email Preview & Hiring Decision Endpoints ===")
    base_url = _start_fresh_local_server()
    hr_token = _get_or_provision_hr_token()
    headers = {"Authorization": f"Bearer {hr_token}"}

    db = get_supabase_service_client()
    cands = db.table("candidates").select("id, name, status").order("created_at", desc=True).limit(1).execute().data
    if not cands:
        print("No candidates found in DB yet. Run `python scripts/smoke_flow.py` first to seed a job and candidates.")
        sys.exit(1)

    candidate_id = str(cands[0]["id"])
    print(f"Using Candidate: {cands[0].get('name')} (id={candidate_id})\n")

    with httpx.Client(base_url=base_url, timeout=30.0) as client:
        # 1. PATCH /hr/candidates/{id}/status
        r1 = client.patch(
            f"/hr/candidates/{candidate_id}/status",
            headers=headers,
            json={"status": "shortlisted", "reason": "Strong system design"},
        )
        print(f"[1/5] PATCH /status -> {r1.status_code}: {r1.json()}")
        assert r1.status_code == 200

        # 2. PATCH /hr/candidates/{id}/score
        r2 = client.patch(
            f"/hr/candidates/{candidate_id}/score",
            headers=headers,
            json={"score": 92, "note": "Verified GitHub portfolio"},
        )
        print(f"[2/5] PATCH /score  -> {r2.status_code}: {r2.json()}")
        assert r2.status_code == 200

        # 3. GET /hr/candidates/{id}/email-preview?type=hired
        r3 = client.get(
            f"/hr/candidates/{candidate_id}/email-preview?type=hired",
            headers=headers,
        )
        preview = r3.json()
        print(f"[3/5] GET /email-preview?type=hired -> {r3.status_code}: subject='{preview.get('subject')}'")
        assert r3.status_code == 200

        # 4. POST /hr/candidates/{id}/decision (initial decision: on_hold, send_email=False)
        r4 = client.post(
            f"/hr/candidates/{candidate_id}/decision",
            headers=headers,
            json={"decision": "on_hold", "reason": "Comparing final round candidates", "send_email": False},
        )
        print(f"[4/5] POST /decision (on_hold, send_email=false) -> {r4.status_code}: {r4.json()}")
        assert r4.status_code == 200

        # 5. POST /hr/candidates/{id}/decision (change decision: hired, send_email=True -> corrected_decision)
        r5 = client.post(
            f"/hr/candidates/{candidate_id}/decision",
            headers=headers,
            json={"decision": "hired", "reason": "Unanimous team hire", "send_email": True},
        )
        print(f"[5/5] POST /decision (change to hired, send_email=true) -> {r5.status_code}: {r5.json()}")
        assert r5.status_code == 200

    print("\n[SUCCESS] All HR control & decision endpoints verified against live Supabase DB!")


if __name__ == "__main__":
    main()
