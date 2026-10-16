import React from "react";
import { NeuSidebar } from "@/components/neu/NeuSidebar";

// OWNER: M1 (frontend developer)
export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#1E201E]">
      <NeuSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
