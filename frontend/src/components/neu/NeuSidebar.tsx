"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LayoutDashboard, Briefcase, PlusCircle, Palette, LogOut, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";

export const NeuSidebar: React.FC = () => {
  const pathname = usePathname();
  const [unansweredCount, setUnansweredCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    api
      .getHROverrides()
      .then((overrides) => {
        if (!isMounted) return;
        let count = 0;
        overrides.forEach((o) => {
          o.questions?.forEach((q) => {
            if (!q.answer) count++;
          });
        });
        setUnansweredCount(count);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const navItems = [
    { label: "Overview", href: "/hr", icon: LayoutDashboard },
    { label: "Jobs", href: "/hr/jobs", icon: Briefcase },
    { label: "Post Job", href: "/hr/jobs/new", icon: PlusCircle },
    { label: "Overrides", href: "/hr/overrides", icon: ShieldAlert, badge: unansweredCount },
    { label: "Design Check", href: "/hr/design-check", icon: Palette },
  ];

  return (
    <aside className="w-20 md:w-64 min-h-screen bg-[#242724] border-r border-[#D9DADF]/5 p-3 md:p-5 flex flex-col justify-between shrink-0 transition-all">
      <div>
        {/* Brand Logo Header: Full on md+, Mark on small screens / collapsed */}
        <div className="flex items-center justify-center md:justify-start px-1 md:px-3 py-4 mb-6">
          <div className="hidden md:block">
            <Logo variant="full" size="md" href="/hr" priority />
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
        <div className="flex items-center justify-between px-2 md:px-3 py-2 rounded-xl bg-[#2A2D2A]/60">
          <div className="hidden md:block truncate">
            <p className="text-xs font-semibold text-[#D9DADF] truncate">hr@asanhire.dev</p>
            <p className="text-[10px] text-[#8A8B82]">Lead Recruiter</p>
          </div>
          <Link
            href="/login"
            className="p-1.5 text-[#8A8B82] hover:text-[#E57373] transition-colors mx-auto md:mx-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
};
