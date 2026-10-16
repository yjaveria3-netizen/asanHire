"use client";

import React from "react";
import { AuditLog } from "@/lib/types";
import { History, ShieldCheck, ArrowRight } from "lucide-react";

interface AuditTrailProps {
  logs: AuditLog[];
}

// OWNER: M1 (frontend developer)
export const AuditTrail: React.FC<AuditTrailProps> = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-[#8A8B82] neu-inset rounded-xl">
        No audit log events recorded yet.
      </div>
    );
  }

  return (
    <div className="neu-raised rounded-2xl p-6 border border-[#D9DADF]/5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#8A8B82]/20">
        <History className="w-4 h-4 text-[#DD700B]" />
        <h4 className="text-sm font-semibold text-[#D9DADF]">Immutable Audit Trail</h4>
      </div>

      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3.5 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#DD700B] uppercase tracking-wide">
                {log.action.replace("_", " ")}
              </span>
              <span className="text-[11px] text-[#8A8B82]">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-[#D9DADF] font-medium italic">
              &quot;{log.reason}&quot;
            </p>

            <div className="flex items-center gap-2 text-[11px] text-[#8A8B82] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8FD19E]" />
              <span>Actor: {log.user_id ? "HR Recruiter" : "System Autonomous Agent"}</span>
              {log.previous_state?.status && log.new_state?.status && (
                <span className="ml-auto flex items-center gap-1 font-mono">
                  <span>{log.previous_state.status}</span>
                  <ArrowRight className="w-3 h-3 text-[#DD700B]" />
                  <span className="text-[#D9DADF]">{log.new_state.status}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
