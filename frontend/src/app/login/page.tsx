"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail) || !password) {
      toast.error("Invalid email or password");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        toast.error("Invalid email or password");
        return;
      }

      router.push("/hr");
      router.refresh();
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E201E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo + subtitle */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <Logo variant="tile" size="lg" href="/" priority />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
            Recruiter &amp; HR Portal
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#383A38] bg-[#262826] shadow-xl p-8">

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#D9DADF]">Sign In</h1>
            <p className="mt-1 text-sm text-[#8A8B82]">
              Enter your credentials to access the HR Dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
              >
                Work Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="hr@asanhire.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
                className="block w-full h-10 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="current-password"
                className="block w-full h-10 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-[#DD700B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c26006] focus:outline-none focus:ring-2 focus:ring-[#DD700B] focus:ring-offset-2 focus:ring-offset-[#262826] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In…" : "Sign In"}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
