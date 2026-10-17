"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuInput } from "@/components/neu/NeuInput";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

export default function AdminPasswordSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then(setCurrentUser).catch(() => {});
  }, []);

  const userEmail = currentUser?.email || "";
  const isMinLength = newPassword.length >= 12;
  const isDifferentFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const isNotEmail = !userEmail || newPassword.toLowerCase() !== userEmail.toLowerCase();
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isValid =
    isMinLength &&
    isDifferentFromCurrent &&
    isNotEmail &&
    passwordsMatch &&
    currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.adminChangePassword(currentPassword, newPassword);
      setSuccess("Your admin password has been rotated successfully. Security locks cleared.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        router.push("/admin/overview");
      }, 1500);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to update password. Please verify your current password or check rate limits."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-12">
      {/* Back to Overview if not locked */}
      {!currentUser?.must_change_password && (
        <div>
          <Link
            href="/admin/overview"
            className="inline-flex items-center gap-2 text-sm text-[#8A8B82] hover:text-[#DD700B] transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-[#242724]"
          >
            <ArrowLeft className="w-4 h-4 text-[#DD700B]" />
            <span>Back to Admin Overview</span>
          </Link>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#D9DADF] flex items-center gap-2.5">
          <KeyRound className="w-7 h-7 text-[#DD700B]" />
          Admin Security Settings
        </h1>
        <p className="text-sm text-[#8A8B82] mt-1.5 leading-relaxed">
          Manage administrator authentication credentials, session security, and rotation policies.
        </p>
      </div>

      {currentUser?.must_change_password && (
        <div className="p-4 rounded-xl bg-[rgba(221,112,11,0.15)] border border-[#DD700B]/40 flex items-start gap-3 text-xs text-[#DD700B]">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-[#DD700B]">Mandatory Rotation Required</h4>
            <p className="text-[#D9DADF] mt-0.5 leading-relaxed">
              You are currently signed in with an initial provisioning credential. You must choose a secure 12+ character password before you can view candidate rosters, HR logs, or configure requisitions.
            </p>
          </div>
        </div>
      )}

      {/* Main Password Change Form */}
      <NeuCard variant="raised" className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="pb-3 border-b border-[#8A8B82]/20">
            <h3 className="text-sm font-semibold text-[#D9DADF]">Change Password</h3>
            <p className="text-xs text-[#8A8B82] mt-0.5">
              Enter your current password followed by a compliant replacement.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[rgba(90,42,42,0.3)] border border-[#E57373]/30 text-xs text-[#E57373] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-[rgba(62,90,68,0.3)] border border-[#8FD19E]/30 text-xs text-[#8FD19E] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider">
              Current Password <span className="text-[#DD700B]">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current administrator password..."
                required
                className="neu-inset w-full bg-[#1E201E] text-xs text-[#D9DADF] px-3.5 py-2.5 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-[#8A8B82] hover:text-[#D9DADF]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider">
              New Password <span className="text-[#DD700B]">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter strong new password (min 12 characters)..."
                required
                className="neu-inset w-full bg-[#1E201E] text-xs text-[#D9DADF] px-3.5 py-2.5 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-[#8A8B82] hover:text-[#D9DADF]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider">
              Confirm New Password <span className="text-[#DD700B]">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password..."
                required
                className="neu-inset w-full bg-[#1E201E] text-xs text-[#D9DADF] px-3.5 py-2.5 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-[#8A8B82] hover:text-[#D9DADF]"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Live Validation Rules */}
          <div className="p-4 rounded-xl bg-[#242724] border border-[#8A8B82]/15 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#8A8B82] uppercase tracking-wider">
              Password Security Criteria
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div
                className={`flex items-center gap-1.5 ${
                  isMinLength ? "text-[#8FD19E]" : "text-[#8A8B82]"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isMinLength ? "bg-[#8FD19E]" : "bg-[#8A8B82]"}`} />
                At least 12 characters ({newPassword.length}/12)
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  isDifferentFromCurrent ? "text-[#8FD19E]" : "text-[#8A8B82]"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isDifferentFromCurrent ? "bg-[#8FD19E]" : "bg-[#8A8B82]"}`} />
                Different from current password
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  isNotEmail ? "text-[#8FD19E]" : "text-[#8A8B82]"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isNotEmail ? "bg-[#8FD19E]" : "bg-[#8A8B82]"}`} />
                Does not equal email address
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  passwordsMatch ? "text-[#8FD19E]" : "text-[#8A8B82]"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? "bg-[#8FD19E]" : "bg-[#8A8B82]"}`} />
                Passwords match
              </div>
            </div>
          </div>

          {/* MFA Recommendation Notice */}
          <div className="p-3.5 rounded-xl bg-[#242724] border border-[#8FD19E]/20 flex items-start gap-3 text-xs text-[#D9DADF]">
            <ShieldCheck className="w-5 h-5 text-[#8FD19E] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#8FD19E]">MFA Recommendation:</strong> We strongly encourage enabling Multi-Factor Authentication (TOTP authenticator app) on your Supabase Auth account to guard administrative privileges against credential stuffing attacks.
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end pt-3 border-t border-[#8A8B82]/20">
            <NeuButton
              type="submit"
              variant="primary"
              disabled={!isValid || loading}
            >
              {loading ? "Rotating Password..." : "Update Admin Password"}
            </NeuButton>
          </div>
        </form>
      </NeuCard>
    </div>
  );
}
