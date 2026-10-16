"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HRDashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || null);
        }
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore errors on sign out
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto py-10">
      <Card className="border-[#383A38] bg-[#262826] shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-[#D9DADF]">
            HR Dashboard
          </CardTitle>
          <CardDescription className="text-[#8A8B82]">
            Candidate screening and recruitment orchestration workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-[#1E201E] border border-[#383A38]">
            <span className="text-xs uppercase tracking-wider text-[#8A8B82] font-semibold block mb-1">
              Logged-in User
            </span>
            <p className="text-base font-mono text-[#DD700B]">
              {loading ? "Loading..." : email || "hr@asanhire.dev"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-2">
          <p className="text-xs text-[#8A8B82]">
            AI Recommends. Human Decides.
          </p>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={loggingOut}
            className="border-[#8A8B82]/30 text-[#D9DADF] hover:bg-[#1E201E] hover:text-[#E57373]"
          >
            {loggingOut ? "Signing out..." : "Logout"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
