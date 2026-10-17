#!/usr/bin/env python3
"""
scripts/create_admin.py

Creates or provisions an administrative account in Supabase.
Ensures the account exists in auth.users, assigns the 'admin' role in public.user_roles,
and sets must_change_password = True.

Security:
- Never hardcodes passwords or emails.
- Uses SUPABASE_SERVICE_ROLE_KEY strictly server-side.
- Generates a cryptographically strong random password if none is provided.
"""

import sys
import os
import argparse
import secrets
import string
import httpx

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.db import get_supabase_service_client


def generate_secure_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least one uppercase, lowercase, digit, and symbol
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    pwd += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


def create_or_update_admin(email: str, password: str | None = None) -> None:
    email = email.strip().lower()
    if not email or "@" not in email:
        print("[Error] A valid email address is required.", file=sys.stderr)
        sys.exit(1)

    generated = False
    if not password:
        password = generate_secure_password(16)
        generated = True
    elif len(password) < 12:
        print("[Error] Admin password must be at least 12 characters.", file=sys.stderr)
        sys.exit(1)

    supabase_url = settings.SUPABASE_URL.rstrip("/")
    service_key = settings.SUPABASE_SERVICE_ROLE_KEY

    if not supabase_url or not service_key:
        print("[Error] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.", file=sys.stderr)
        sys.exit(1)

    admin_headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

    # Step 1: Query if user exists via Supabase Admin API
    user_id = None
    with httpx.Client(timeout=10.0) as client:
        # Search existing users
        search_resp = client.get(
            f"{supabase_url}/auth/v1/admin/users",
            headers=admin_headers,
            params={"page": 1, "per_page": 50},
        )
        if search_resp.status_code == 200:
            users_data = search_resp.json().get("users", [])
            for u in users_data:
                if u.get("email", "").lower() == email:
                    user_id = u.get("id")
                    break

        if user_id:
            # Update password and confirm email
            update_payload = {
                "password": password,
                "email_confirm": True,
            }
            up_resp = client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers=admin_headers,
                json=update_payload,
            )
            if up_resp.status_code not in (200, 204):
                print(f"[Error] Failed to update user in Supabase Auth: {up_resp.status_code}", file=sys.stderr)
                sys.exit(1)
            print(f"[Success] Updated existing auth user {email} ({user_id}).")
        else:
            # Create user
            create_payload = {
                "email": email,
                "password": password,
                "email_confirm": True,
            }
            create_resp = client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers=admin_headers,
                json=create_payload,
            )
            if create_resp.status_code not in (200, 201):
                print(f"[Error] Failed to create user in Supabase Auth: {create_resp.status_code} - {create_resp.text}", file=sys.stderr)
                sys.exit(1)
            user_id = create_resp.json().get("id")
            print(f"[Success] Created new auth user {email} ({user_id}).")

    # Step 2: Assign admin role and set must_change_password = True in public.user_roles
    db = get_supabase_service_client()
    try:
        # Check if role entry exists
        existing_role = db.table("user_roles").select("*").eq("user_id", user_id).execute()
        if existing_role and existing_role.data:
            db.table("user_roles").update({
                "role": "admin",
                "must_change_password": True,
            }).eq("user_id", user_id).execute()
        else:
            db.table("user_roles").insert({
                "user_id": user_id,
                "role": "admin",
                "must_change_password": True,
            }).execute()
        print("[Success] Assigned 'admin' role with must_change_password=True.")
    except Exception as e:
        print(f"[Warning] Failed to update user_roles table: {e}", file=sys.stderr)

    print("\n" + "=" * 60)
    print("ADMIN CREDENTIALS CONFIGURED")
    print(f"Email:    {email}")
    if generated:
        print(f"Temporary Password: {password}")
    else:
        print("Password: (as provided)")
    print("Must Change Password on First Login: True")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Create or configure an asanHire Admin account.")
    parser.add_argument("email", type=str, help="Admin user's email address")
    parser.add_argument("--password", type=str, default=None, help="Optional initial password (min 12 chars)")
    args = parser.parse_args()

    create_or_update_admin(args.email, args.password)


if __name__ == "__main__":
    main()
