"""
asanHire Render Keep-Alive Pinger
Pings https://asanhire.onrender.com/health every 60 seconds to prevent
Render free-tier instances from spinning down due to inactivity.

Usage:
    python backend/scripts/keep_alive.py
    python backend/scripts/keep_alive.py --interval 60 --url https://asanhire.onrender.com/health
"""

import sys
import time
import argparse
import urllib.request
import urllib.error
from datetime import datetime

# Ensure utf-8 encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

DEFAULT_URL = "https://asanhire.onrender.com/health"
DEFAULT_INTERVAL = 60  # seconds

def ping(url: str) -> None:
    start_time = time.time()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "asanHire-KeepAlive/1.0"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            latency_ms = round((time.time() - start_time) * 1000)
            body = response.read().decode("utf-8", errors="ignore").strip()
            print(f"[{timestamp}] [OK] {response.status} ({latency_ms}ms) -> {body}", flush=True)
    except urllib.error.HTTPError as e:
        latency_ms = round((time.time() - start_time) * 1000)
        print(f"[{timestamp}] [WARN] HTTP {e.code} ({latency_ms}ms)", flush=True)
    except urllib.error.URLError as e:
        latency_ms = round((time.time() - start_time) * 1000)
        print(f"[{timestamp}] [FAIL] Connection error ({latency_ms}ms): {e.reason}", flush=True)
    except Exception as e:
        print(f"[{timestamp}] [ERROR] {e}", flush=True)

def main():
    parser = argparse.ArgumentParser(description="Keep Render service awake")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Health URL to ping (default: {DEFAULT_URL})")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help="Ping interval in seconds (default: 60)")
    args = parser.parse_args()

    print("=" * 65, flush=True)
    print("asanHire Render Keep-Alive Script Started", flush=True)
    print(f"Target URL : {args.url}", flush=True)
    print(f"Interval   : Every {args.interval} seconds", flush=True)
    print("Press Ctrl+C to stop.", flush=True)
    print("=" * 65, flush=True)

    try:
        while True:
            ping(args.url)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nKeep-alive script stopped.", flush=True)
        sys.exit(0)

if __name__ == "__main__":
    main()
