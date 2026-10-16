"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail) || !password) {
      toast.error("Please enter a valid work email and password", {
        position: "top-center",
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        toast.error(error.message || "Invalid email or password", {
          position: "top-center",
        });
        return;
      }

      toast.success("Signed in successfully! Redirecting to Recruiter Portal...", {
        position: "top-center",
      });
      router.push("/hr");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Sign in failed. Please try again.", {
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) {
      toast.error("Please enter your full name", { position: "top-center" });
      return;
    }

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid work email", { position: "top-center" });
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long", {
        position: "top-center",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match", { position: "top-center" });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const redirectOrigin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL || "https://asan-hire.vercel.app");
      const redirectUrl = `${redirectOrigin}/auth/callback?next=/hr`;

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: trimmedName,
          },
        },
      });

      if (error) {
        toast.error(error.message || "Registration failed", {
          position: "top-center",
        });
        return;
      }

      // If Supabase auto-confirms or returned a valid session
      if (data?.session) {
        toast.success("Account registered and signed in! Redirecting...", {
          position: "top-center",
        });
        router.push("/hr");
        router.refresh();
      } else {
        toast.success(
          "Account created successfully! You can now sign in with your credentials.",
          {
            duration: 5000,
            position: "top-center",
          }
        );
        // Switch to sign-in tab with email preserved
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Registration error. Please try again.", {
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex items-center justify-center p-4 selection:bg-[#DD700B] selection:text-[#1E201E]">
      <div className="w-full max-w-md">
        {/* Logo + Subtitle */}
        <div className="flex flex-col items-center mb-6 gap-3">
          <Logo variant="full" size="md" href="/" priority />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
            Recruiter &amp; HR Sovereign Portal
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="neu-inset p-1.5 rounded-xl flex items-center justify-between mb-4 bg-[#232623] border border-[#383A38]">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === "signin"
                ? "bg-[#DD700B] text-[#1E201E] shadow-[0_2px_10px_rgba(221,112,11,0.3)]"
                : "text-[#8A8B82] hover:text-[#D9DADF]"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === "register"
                ? "bg-[#DD700B] text-[#1E201E] shadow-[0_2px_10px_rgba(221,112,11,0.3)]"
                : "text-[#8A8B82] hover:text-[#D9DADF]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register (Sign Up)</span>
          </button>
        </div>

        {/* Auth Card */}
        <div className="neu-raised rounded-2xl border border-[#383A38] bg-[#262826] shadow-xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#D9DADF]">
              {mode === "signin" ? "Recruiter Sign In" : "Create HR Account"}
            </h1>
            <p className="mt-1 text-xs text-[#8A8B82]">
              {mode === "signin"
                ? "Enter your credentials to access your hiring dashboard"
                : "Register as an HR administrator to orchestrate multi-agent hiring"}
            </p>
          </div>

          {mode === "signin" ? (
            /* ================= SIGN IN FORM ================= */
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    placeholder="hr@asanhire.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                    className="block w-full h-10 pl-9 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    className="block w-full h-10 pl-9 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#DD700B] px-5 py-2.5 text-sm font-semibold text-[#1E201E] shadow-[0_2px_12px_rgba(221,112,11,0.35)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                <span>{loading ? "Signing In..." : "Sign In to Cockpit"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-xs text-[#8A8B82] hover:text-[#DD700B] transition-colors"
                >
                  Don&apos;t have an account? <span className="underline font-semibold text-[#DD700B]">Register here</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Alex Morgan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                    className="block w-full h-10 pl-9 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="regEmail"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="regEmail"
                    type="email"
                    placeholder="alex@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                    className="block w-full h-10 pl-9 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="regPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                >
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="regPassword"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="block w-full h-10 pl-9 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="block w-full h-10 pl-9 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#DD700B] px-5 py-2.5 text-sm font-semibold text-[#1E201E] shadow-[0_2px_12px_rgba(221,112,11,0.35)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                <span>{loading ? "Creating Account..." : "Create Account & Register"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs text-[#8A8B82] hover:text-[#DD700B] transition-colors"
                >
                  Already have an account? <span className="underline font-semibold text-[#DD700B]">Sign In here</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
