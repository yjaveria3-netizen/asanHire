"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LayoutDashboard, Briefcase, PlusCircle, LogOut, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export const NeuSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [unansweredCount, setUnansweredCount] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("Recruiter");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    api
      .getMe()
      .then((profile) => {
        if (!isMounted) return;
        if (profile?.role === "candidate") {
          router.replace("/jobs");
          return;
        }
        if (profile?.email) {
          setUserEmail(profile.email);
        }
        const title = profile?.hr_profile?.job_title || (profile?.role === "admin" ? "Administrator" : "Recruiter");
        setUserRole(title);
      })
      .catch(() => {
        const supabase = createClient();
        supabase.auth
          .getUser()
          .then(({ data }) => {
            if (isMounted && data?.user?.email) {
              setUserEmail(data.user.email);
              if (data.user.user_metadata?.role === "candidate") {
                router.replace("/jobs");
              }
            }
          })
          .catch(() => {});
      });

    api
      .getHROverrides()
      .then((overrides) => {
        if (!isMounted) return;
        let count = 0;
        const list = Array.isArray(overrides) ? overrides : ((overrides as any)?.overrides || []);
        list.forEach((o: any) => {
          o.questions?.forEach((q: any) => {
            if (!q.answer) count++;
          });
        });
        setUnansweredCount(count);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Handled silently
    } finally {
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      }
      router.push("/login?logout=true");
      router.refresh();
    }
  };

  const navItems = [
    { label: "Overview", href: "/hr", icon: LayoutDashboard },
    { label: "Jobs", href: "/hr/jobs", icon: Briefcase },
    { label: "Post Job", href: "/hr/jobs/new", icon: PlusCircle },
    { label: "Overrides", href: "/hr/overrides", icon: ShieldAlert, badge: unansweredCount },
  ];

  return (
    <aside className="w-20 md:w-64 h-screen sticky top-0 bg-[#242724] border-r border-[#D9DADF]/5 p-3 md:p-5 flex flex-col justify-between shrink-0 transition-all overflow-hidden">
      <div>
        {/* Brand Logo Header: Full on md+, Mark on small screens / collapsed */}
        <div className="flex items-center justify-center md:justify-start px-1 md:px-3 py-4 mb-6">
          <div className="hidden md:block">
            <Logo variant="full" size="lg" href="/hr" priority />
          </div>
          <div className="block md:hidden">
            <Logo variant="mark" size="md" href="/hr" priority />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const hasBadge = Boolean(item.badge && item.badge > 0);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "neu-inset text-[#DD700B] font-semibold"
                    : "text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#2A2D2A]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#DD700B]" : "text-[#8A8B82]"}`} />
                  <span className="hidden md:inline truncate">{item.label}</span>
                </div>
                {hasBadge && (
                  <span className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#DD700B] text-[#1E201E]">
                    {item.badge}
                  </span>
                )}
                {hasBadge && (
                  <span className="md:hidden w-2 h-2 rounded-full bg-[#DD700B]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="pt-4 border-t border-[#8A8B82]/20">
        <div className="flex items-center justify-between px-2 md:px-3 py-2.5 rounded-xl bg-[#2A2D2A]/60">
          <div className="hidden md:block truncate">
            <p className="text-sm font-semibold text-[#D9DADF] truncate" title={userEmail || "Recruiter"}>
              {userEmail || "Recruiter Workspace"}
            </p>
            <p className="text-xs text-[#8A8B82] font-mono">{userRole}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 text-[#8A8B82] hover:text-[#E57373] hover:bg-[#1E201E] rounded-lg transition-colors mx-auto md:mx-0 disabled:opacity-50"
            title="Sign out of Recruiter Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
