import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import get_supabase_service_client

def main():
    print("=== asanHire Supabase Service Client Check ===")
    try:
        client = get_supabase_service_client()
        # Query jobs count only (no sensitive data or candidate information)
        res = client.table("jobs").select("id", count="exact").execute()
        count = res.count if res.count is not None else len(res.data)
        print(f"[PASS] Supabase Service Client: Successfully connected and read 'jobs' table (count={count}).")
        print("===============================================")
        sys.exit(0)
    except Exception as e:
        print(f"[FAIL] Supabase Service Client connection error: {type(e).__name__} ({str(e)})")
        print("===============================================")
        sys.exit(1)

if __name__ == "__main__":
    main()
