"use client";

import React from "react";
import { Mail, Check } from "lucide-react";
import { NeuButton } from "@/components/neu/NeuButton";

interface EmailPreviewProps {
  recipient: string;
  subject: string;
  htmlBody: string;
  onSend?: () => void;
  isLoading?: boolean;
}

// OWNER: M1 (frontend developer)
export const EmailPreview: React.FC<EmailPreviewProps> = ({
  recipient,
  subject,
  htmlBody,
  onSend,
  isLoading = false,
}) => {
  return (
    <div className="neu-raised rounded-2xl p-6 border border-[#D9DADF]/5 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#8A8B82]/20">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#DD700B]" />
          <h4 className="text-sm font-semibold text-[#D9DADF]">Email Template Preview</h4>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#DD700B]/10 text-[#DD700B]">
          Resend API
        </span>
      </div>

      <div className="text-xs flex flex-col gap-1 text-[#8A8B82]">
        <div>
          <span className="font-semibold text-[#D9DADF]">To:</span> {recipient}
        </div>
        <div>
          <span className="font-semibold text-[#D9DADF]">Subject:</span> {subject}
        </div>
      </div>

      <div className="neu-inset rounded-xl p-4 bg-[#1A1C1A] text-xs text-[#D9DADF] leading-relaxed max-h-56 overflow-y-auto">
        <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
      </div>

      {onSend && (
        <div className="flex justify-end pt-2">
          <NeuButton size="sm" variant="primary" onClick={onSend} disabled={isLoading}>
            <Check className="w-3.5 h-3.5 mr-1" />
            {isLoading ? "Dispatching..." : "Send Email via Resend"}
          </NeuButton>
        </div>
      )}
    </div>
  );
};
