import React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#1E201E] text-[#D9DADF]">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#262826] border border-[#383A38] shadow-xl text-center space-y-6">
        <div className="flex justify-center">
          <Logo variant="full" size="lg" href="/" priority />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#D9DADF]">
            AI Recommends. <span className="text-[#DD700B]">Human Decides.</span>
          </h1>
          <p className="text-sm text-[#8A8B82]">
            Streamlined AI-assisted hiring workflow with full human oversight and proctoring orchestration.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#DD700B] hover:bg-[#c26006] transition-colors focus:outline-none focus:ring-2 focus:ring-[#DD700B] focus:ring-offset-2 focus:ring-offset-[#1E201E]"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
