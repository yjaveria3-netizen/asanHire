"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Search,
  KeyRound,
  LogOut,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getMe()
      .then((user) => {
        if (!isMounted) return;
        setCurrentUser(user);

        // G0: If must_change_password is true, redirect EVERY admin page to /admin/settings/password
        if (
          user?.must_change_password &&
          pathname !== "/admin/settings/password" &&
          pathname !== "/admin/settings"
        ) {
          router.replace("/admin/settings/password");
        }
      })
      .catch((err) => {
        console.warn("Could not load current user:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const mustChangePassword = currentUser?.must_change_password;

  const navLinks = [
    { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
    { label: "Overrides", href: "/admin/overrides", icon: ShieldAlert },
    { label: "HR Users", href: "/admin/hr-users", icon: Users },
    { label: "Candidate Lookup", href: "/admin/candidates", icon: Search },
    { label: "Settings", href: "/admin/settings/password", icon: KeyRound },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E201E] flex items-center justify-center text-sm text-[#8A8B82]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
          Verifying administrative credentials...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex flex-col">
      {/* Top Admin Navbar */}
      <header className="bg-[#242724] border-b border-[#D9DADF]/10 px-4 md:px-8 py-3.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand + Admin Badge */}
          <div className="flex items-center gap-3">
            <Logo variant="full" size="md" href="/admin/overview" priority />
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[rgba(221,112,11,0.15)] text-[#DD700B] border border-[#DD700B]/30">
              <ShieldCheck className="w-3 h-3 text-[#DD700B]" />
              Super Admin
            </span>
          </div>

          {/* Navigation Items (Disabled if must_change_password) */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              const isDisabled =
                mustChangePassword && item.href !== "/admin/settings/password";

              if (isDisabled) {
                return (
                  <span
                    key={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#8A8B82]/40 cursor-not-allowed select-none"
                    title="Locked until password rotation"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "neu-inset text-[#DD700B] font-semibold"
                      : "text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#2A2D2A]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#DD700B]" : "text-[#8A8B82]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#D9DADF] leading-tight">
                {currentUser?.email || "admin@asanhire.dev"}
              </span>
              <span className="text-[10px] text-[#8A8B82] font-mono capitalize">
                {currentUser?.role || "Admin"}
              </span>
            </div>
            <Link
              href="/login"
              title="Sign out"
              className="p-2 text-[#8A8B82] hover:text-[#E57373] hover:bg-[#2A2D2A] rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Password Rotation Warning Banner (if must_change_password is true) */}
      {mustChangePassword && (
        <div className="bg-[rgba(221,112,11,0.18)] border-b border-[#DD700B]/50 px-4 py-2.5 text-xs text-[#DD700B] flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Action Required:</strong> Initial administrator password rotation is mandatory before accessing administrative data views or supervisor endpoints.
          </span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
