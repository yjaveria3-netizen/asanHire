"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { NeuSidebar } from "@/components/neu/NeuSidebar";

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login?logout=true");
          return;
        }

        // Fast metadata check: If user registered as candidate, redirect immediately to candidate portal
        const metaRole = (user.user_metadata?.role as string) || "";
        if (metaRole === "candidate") {
          router.replace("/jobs");
          return;
        }

        // Detailed profile verification via backend
        const profile = await api.getMe().catch(() => null);
        if (profile?.role === "candidate") {
          router.replace("/jobs");
          return;
        }

        if (profile?.hr_profile?.status === "pending") {
          await supabase.auth.signOut().catch(() => {});
          router.replace("/login?pending=true");
          return;
        }

        if (isMounted) {
          setAuthorized(true);
        }
      } catch {
        if (isMounted) {
          setAuthorized(true);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (authorized === null) {
    return (
      <div className="flex h-screen bg-[#1E201E] items-center justify-center text-xs font-mono text-[#8A8B82]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
          <span>Verifying Recruiter Access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#1E201E]">
      <NeuSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
