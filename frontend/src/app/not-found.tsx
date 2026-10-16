import React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NeuButton } from "@/components/neu/NeuButton";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1E201E] flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Centered Mark Logo */}
        <Logo variant="mark" size="xl" href={null} priority />

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-[#DD700B] uppercase tracking-wider font-semibold">
            404 Error
          </span>
          <h1 className="text-2xl font-bold text-[#D9DADF]">Page Not Found</h1>
          <p className="text-sm text-[#8A8B82] leading-relaxed">
            The requested requisition, candidate dossier, or page could not be located in the asanHire system.
          </p>
        </div>

        <Link href="/">
          <NeuButton variant="primary" size="md">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Home
          </NeuButton>
        </Link>
      </div>
    </div>
  );
}
