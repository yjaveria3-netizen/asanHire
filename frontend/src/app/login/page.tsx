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
  Clock,
  Building2,
} from "lucide-react";

import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [role, setRole] = useState<"hr" | "candidate">("hr");

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Pending approval screen state
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail) || !password) {
      toast.error("Please enter a valid email and password", {
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

      // Check user role and status
      try {
        const profile = await api.getMe();
        if (profile?.role === "admin") {
          toast.success("Welcome, Administrator!", { position: "top-center" });
          router.push("/admin");
          router.refresh();
          return;
        }

        if (profile?.role === "candidate") {
          toast.success("Signed in successfully!", { position: "top-center" });
          router.push("/jobs");
          router.refresh();
          return;
        }

        // HR user verification
        const hrStatus = profile?.hr_profile?.status;
        if (hrStatus === "pending") {
          await supabase.auth.signOut();
          setPendingEmail(trimmedEmail);
          setShowPendingScreen(true);
          toast.error("Your HR account is pending administrator approval. Please contact admin@asanhire.dev.", {
            position: "top-center",
            duration: 6000,
          });
          return;
        }

        if (hrStatus === "suspended") {
          await supabase.auth.signOut();
          toast.error("Your HR account has been suspended. Please contact administrator.", {
            position: "top-center",
          });
          return;
        }
      } catch (err: any) {
        const errMsg = err?.message || "";
        if (errMsg.includes("pending") || errMsg.includes("approval")) {
          await supabase.auth.signOut();
          setPendingEmail(trimmedEmail);
          setShowPendingScreen(true);
          toast.error("Your HR account is pending administrator approval.", { position: "top-center" });
          return;
        }
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
    const trimmedOrg = organization.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) {
      toast.error("Please enter your full name", { position: "top-center" });
      return;
    }

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address", { position: "top-center" });
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
      const redirectUrl = `${redirectOrigin}/auth/callback?next=${role === "hr" ? "/hr" : "/jobs"}`;

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: trimmedName,
            role: role,
            organization: trimmedOrg,
          },
        },
      });

      if (error) {
        toast.error(error.message || "Registration failed", {
          position: "top-center",
        });
        return;
      }

      const userId = data?.user?.id;
      if (userId) {
        // Enforce role and pending gate via API
        await api.registerRole({
          user_id: userId,
          email: trimmedEmail,
          full_name: trimmedName,
          role: role,
          organization: trimmedOrg,
        }).catch((err) => console.warn("Failed to register role intent:", err));
      }

      if (role === "hr") {
        // Sign out HR user immediately so they cannot enter /hr until approved
        await supabase.auth.signOut().catch(() => {});
        setPendingEmail(trimmedEmail);
        setShowPendingScreen(true);
        toast.success("HR registration submitted! Awaiting administrator approval.", {
          position: "top-center",
          duration: 6000,
        });
      } else {
        // Candidate registration
        if (data?.session) {
          toast.success("Candidate account created! Redirecting...", {
            position: "top-center",
          });
          router.push("/jobs");
          router.refresh();
        } else {
          toast.success(
            "Candidate account created successfully! You can now sign in.",
            {
              duration: 5000,
              position: "top-center",
            }
          );
          setMode("signin");
          setPassword("");
          setConfirmPassword("");
        }
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
          <Logo variant="full" size="lg" href="/" priority />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
            Recruiter &amp; HR Sovereign Portal
          </p>
        </div>

        {showPendingScreen ? (
          /* ================= PENDING APPROVAL SCREEN ================= */
          <div className="neu-raised rounded-2xl border border-[#383A38] bg-[#262826] shadow-xl p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#DD700B]/10 border border-[#DD700B]/30 flex items-center justify-center mb-5 text-[#DD700B]">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <h1 className="text-xl font-bold text-[#D9DADF] mb-2">
              HR Recruiter Account Pending Approval
            </h1>

            <p className="text-xs text-[#8A8B82] leading-relaxed max-w-sm mb-6">
              Your recruiter account for <strong className="text-[#D9DADF]">{pendingEmail || email}</strong> has been registered. Before you can access the Sovereign HR Portal, an administrator must review and approve your account.
            </p>

            <div className="w-full neu-inset rounded-xl p-4 border border-[#DD700B]/20 bg-[#1E201E] text-left mb-6">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-[#DD700B] shrink-0 mt-0.5" />
                <div className="text-xs text-[#D9DADF]">
                  <p className="font-semibold text-[#DD700B] mb-1">Confirmation Required</p>
                  <p className="text-[#8A8B82] leading-relaxed">
                    Please email <a href="mailto:admin@asanhire.dev" className="text-[#DD700B] underline font-mono font-medium">admin@asanhire.dev</a> from your official corporate email with your organization details to expedite verification and account activation.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPendingScreen(false);
                setMode("signin");
                setPassword("");
                setConfirmPassword("");
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#DD700B] px-5 py-2.5 text-sm font-semibold text-[#1E201E] shadow-[0_2px_12px_rgba(221,112,11,0.35)] transition-transform hover:brightness-105 active:scale-[0.98]"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
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
                  {mode === "signin" ? "Sign In to Sovereign Portal" : "Create asanHire Account"}
                </h1>
                <p className="mt-1 text-xs text-[#8A8B82]">
                  {mode === "signin"
                    ? "Enter your credentials to access your dashboard"
                    : "Join as an HR recruiter or job candidate"}
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
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
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
                    <span>{loading ? "Signing In..." : "Sign In"}</span>
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
                  {/* Account Type Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
                      Select Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("hr")}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          role === "hr"
                            ? "border-[#DD700B] bg-[#DD700B]/10 shadow-[0_0_12px_rgba(221,112,11,0.15)]"
                            : "border-[#383A38] bg-[#1E201E] hover:border-[#8A8B82]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${role === "hr" ? "text-[#DD700B]" : "text-[#D9DADF]"}`}>
                            HR / Recruiter
                          </span>
                          {role === "hr" && <CheckCircle2 className="w-3.5 h-3.5 text-[#DD700B]" />}
                        </div>
                        <span className="text-[10px] text-[#8A8B82] leading-tight">
                          Requires Admin Approval
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("candidate")}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          role === "candidate"
                            ? "border-[#DD700B] bg-[#DD700B]/10 shadow-[0_0_12px_rgba(221,112,11,0.15)]"
                            : "border-[#383A38] bg-[#1E201E] hover:border-[#8A8B82]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${role === "candidate" ? "text-[#DD700B]" : "text-[#D9DADF]"}`}>
                            Job Candidate
                          </span>
                          {role === "candidate" && <CheckCircle2 className="w-3.5 h-3.5 text-[#DD700B]" />}
                        </div>
                        <span className="text-[10px] text-[#8A8B82] leading-tight">
                          Instant Portal Access
                        </span>
                      </button>
                    </div>
                  </div>

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

                  {/* Organization (only for HR) */}
                  {role === "hr" && (
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="organization"
                        className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                      >
                        Organization / Company
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                        <input
                          id="organization"
                          type="text"
                          placeholder="e.g. Acme Corporation"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          disabled={loading}
                          required
                          className="block w-full h-10 pl-9 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="regEmail"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#8A8B82]"
                    >
                      {role === "hr" ? "Work Email" : "Email Address"}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8A8B82] absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="regEmail"
                        type="email"
                        placeholder={role === "hr" ? "alex@company.com" : "alex@example.com"}
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
                    <span>{loading ? "Creating Account..." : role === "hr" ? "Submit Recruiter Registration" : "Register as Candidate"}</span>
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
          </>
        )}
      </div>
    </div>
  );
}
