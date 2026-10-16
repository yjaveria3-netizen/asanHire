"use client";

import React from "react";
import { MessageSquare, Bot } from "lucide-react";

interface QuestionPanelProps {
  question: string;
  questionIndex: number;
  totalQuestions?: number;
}

// OWNER: M1 (frontend developer)
export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  questionIndex,
  totalQuestions = 5,
}) => {
  return (
    <div className="neu-raised rounded-2xl p-6 border border-[#D9DADF]/10 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#DD700B]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
            asanHire AI Interviewer (Groq)
          </span>
        </div>
        <span className="font-mono text-xs text-[#DD700B] font-semibold bg-[#DD700B]/10 px-2.5 py-1 rounded-full">
          Question {questionIndex} of {totalQuestions}
        </span>
      </div>

      <div className="neu-inset p-5 rounded-xl bg-[#202320]">
        <p className="text-base md:text-lg font-medium text-[#D9DADF] leading-relaxed">
          &quot;{question}&quot;
        </p>
      </div>
    </div>
  );
};
