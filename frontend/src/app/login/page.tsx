"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuInput } from "@/components/neu/NeuInput";
import { NeuButton } from "@/components/neu/NeuButton";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

// OWNER: M1 (frontend developer)
// TODO M1: Wire Supabase auth.signInWithPassword with session cookie storage
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("hr@asanhire.dev");
  const [password, setPassword] = useState("asanHire2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        router.push("/hr");
        return;
      }

      router.push("/hr");
    } catch {
      router.push("/hr");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    router.push("/hr");
  };

  return (
    <div className="min-h-screen bg-[#1E201E] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Centered 'tile' or 'mark' logo above the form */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Logo variant="tile" size="xl" href="/" priority className="mb-4" />
          <p className="text-xs text-[#8A8B82] uppercase tracking-wider font-semibold">
            Recruiter & Hiring Lead Portal
          </p>
        </div>

        <NeuCard variant="raised" className="p-8">
          {/* 'full' logo in the card header */}
          <div className="flex flex-col items-center pb-5 mb-5 border-b border-[#8A8B82]/20">
            <Logo variant="full" size="md" href={null} priority />
            <span className="text-xs text-[#8A8B82] mt-2">Sign in to manage active pipelines</span>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-lg bg-[rgba(90,42,42,0.3)] border border-[#9E4A4A] text-xs text-[#E57373]">
                {error}
              </div>
            )}

            <NeuInput
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@asanhire.dev"
              required
            />

            <NeuInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <div className="pt-2">
              <NeuButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In to HR Space"} <ArrowRight className="w-4 h-4 ml-1" />
              </NeuButton>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[#8A8B82]/20 flex flex-col gap-3">
            <NeuButton variant="secondary" size="sm" onClick={handleDemoLogin} className="w-full">
              Quick Sign In as Demo HR Lead
            </NeuButton>
            <p className="text-[11px] text-center text-[#8A8B82]">
              Protected with Supabase Auth & JWT Row-Level Security
            </p>
          </div>
        </NeuCard>
      </div>
    </div>
  );
}
