"use client";

import React, { useState } from "react";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuInput } from "@/components/neu/NeuInput";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { NeuToggle } from "@/components/neu/NeuToggle";
import { NeuProgress } from "@/components/neu/NeuProgress";
import { NeuModal } from "@/components/neu/NeuModal";
import { CANDIDATE_STATUSES } from "@/lib/constants";
import { Palette, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

// OWNER: M1 (frontend developer)
export default function DesignCheckPage() {
  const [toggleState, setToggleState] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputText, setInputText] = useState("Sample reactive input");

  const colorSwatches = [
    { name: "Background Primary (--bg)", hex: "#1E201E", role: "Deep slate base canvas" },
    { name: "Surface Container (--surface)", hex: "#2A2D2A", role: "Cards, panels & modals" },
    { name: "Primary Neutral Gray (--muted)", hex: "#8A8B82", role: "Borders & secondary text" },
    { name: "Light Neutral Gray (--text)", hex: "#D9DADF", role: "Headings & high-contrast text" },
    { name: "Accent Cinnamon (--accent)", hex: "#DD700B", role: "Primary CTAs, focus & badges" },
    { name: "Soft Cream Accent (--cream)", hex: "#FCF8D8", role: "Highlights & alert tags" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#8A8B82]/20">
        <div className="flex items-center gap-4">
          <Logo variant="tile" size="lg" href={undefined} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#D9DADF]">Design System & Brand Audit</h1>
            </div>
            <p className="text-xs text-[#8A8B82]">
              Theme: <strong className="text-[#DD700B]">Neumorphic Dark (Frozen Mist)</strong> &bull; Accessible WCAG AAA Contrast
            </p>
          </div>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#FCF8D8]/10 text-[#FCF8D8] border border-[#FCF8D8]/30">
          Dev / HR Only View
        </span>
      </div>

      {/* Brand Logo System Showcase */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
          Brand Logo Matrix (Variants & Scales)
        </h2>
        <NeuCard variant="raised" className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#DD700B]">
              1. Full Brandmark (Wordmark + Symbol)
            </h3>
            <div className="flex flex-wrap items-center gap-8 p-4 rounded-xl bg-[#1E201E] border border-white/5">
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="full" size="sm" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">sm (24px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="full" size="md" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">md (32px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="full" size="lg" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">lg (48px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="full" size="xl" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">xl (72px)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#DD700B]">
              2. Standalone Symbol Mark
            </h3>
            <div className="flex flex-wrap items-center gap-8 p-4 rounded-xl bg-[#1E201E] border border-white/5">
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="mark" size="sm" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">sm (24px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="mark" size="md" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">md (32px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="mark" size="lg" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">lg (48px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="mark" size="xl" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">xl (72px)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#DD700B]">
              3. Tile Variant (1:1 Ratio)
            </h3>
            <div className="flex flex-wrap items-center gap-8 p-4 rounded-xl bg-[#1E201E] border border-white/5">
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="tile" size="sm" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">sm (24px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="tile" size="md" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">md (32px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="tile" size="lg" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">lg (48px)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Logo variant="tile" size="xl" href={undefined} />
                <span className="text-[10px] font-mono text-[#8A8B82]">xl (72px)</span>
              </div>
            </div>
          </div>
        </NeuCard>
      </section>

      {/* 1. Color Palette Tokens */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
          1. Brand Palette Tokens
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {colorSwatches.map((color, i) => (
            <div key={i} className="neu-raised rounded-xl p-3 flex flex-col gap-2">
              <div
                className="w-full h-14 rounded-lg border border-black/20"
                style={{ backgroundColor: color.hex }}
              />
              <div>
                <p className="text-xs font-bold font-mono text-[#D9DADF]">{color.hex}</p>
                <p className="text-[11px] font-medium text-[#DD700B] mt-0.5">{color.name.split(" ")[0]}</p>
                <p className="text-[10px] text-[#8A8B82] leading-tight mt-1">{color.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Neumorphic Dual-Direction Elevations & Depths */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
          2. Neumorphic Depth & Lighting Effects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <NeuCard variant="raised" className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-[#D9DADF]">Raised Extrusion (.neu-raised)</h3>
            <p className="text-xs text-[#8A8B82]">
              Dual-directional soft drop shadows (6px 6px 12px #151715, -6px -6px 12px #272927) lifting elements out of the #1E201E slate.
            </p>
          </NeuCard>

          <NeuCard variant="inset" className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-[#D9DADF]">Pressed / Sunken Depth (.neu-inset)</h3>
            <p className="text-xs text-[#8A8B82]">
              Inner directional shadow (inset 4px 4px 8px #151715, inset -4px -4px 8px #272927) creating recessed inputs and wells.
            </p>
          </NeuCard>

          <div className="neu-raised rounded-xl p-6 flex flex-col gap-3 items-center justify-center text-center">
            <span className="btn-primary select-none cursor-pointer">
              Primary CTA Glow (.btn-primary)
            </span>
            <p className="text-[11px] text-[#8A8B82]">
              Solid Cinnamon #DD700B with high-contrast slate text #1E201E and ambient glow.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Status Badges */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
          3. Candidate Status Badges (Never rely on color alone)
        </h2>
        <NeuCard variant="raised" className="p-6">
          <div className="flex flex-wrap gap-3">
            {CANDIDATE_STATUSES.map((status) => (
              <NeuBadge key={status.value} status={status.value} label={status.label} />
            ))}
          </div>
        </NeuCard>
      </section>

      {/* 4. NeuButton States */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
          4. NeuButton Component Matrix
        </h2>
        <NeuCard variant="raised" className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <NeuButton variant="primary">Primary Cinnamon</NeuButton>
            <NeuButton variant="secondary">Secondary Slate</NeuButton>
            <NeuButton variant="ghost">Ghost Transparent</NeuButton>
            <NeuButton variant="danger">Destructive Action</NeuButton>
            <NeuButton variant="primary" disabled>
              Disabled Primary
            </NeuButton>
            <NeuButton variant="secondary" disabled>
              Disabled Secondary
            </NeuButton>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <NeuButton size="sm" variant="primary">Small</NeuButton>
            <NeuButton size="md" variant="primary">Medium (Default)</NeuButton>
            <NeuButton size="lg" variant="primary">Large Hero CTA</NeuButton>
          </div>
        </NeuCard>
      </section>

      {/* 5. Inputs & Form Controls */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
          5. Form Controls & Inset Text Inputs
        </h2>
        <NeuCard variant="raised" className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <NeuInput
            label="Default Inset Input"
            placeholder="Type anything here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            helperText="2px cinnamon focus ring on click"
          />

          <NeuInput
            label="Error Validation State"
            placeholder="Invalid format"
            value="malformed-email@@"
            error="Please provide a valid corporate email address."
            onChange={() => {}}
          />

          <NeuInput
            label="Disabled Input Field"
            value="Read-only system data"
            disabled
            onChange={() => {}}
            helperText="Cannot be edited"
          />
        </NeuCard>
      </section>

      {/* 6. Interactive Toggles, Progress & Modal */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
          6. Interactive Controls & Accessibility Verification
        </h2>
        <NeuCard variant="raised" className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex flex-col gap-3">
            <span className="text-xs text-[#8A8B82] uppercase font-semibold">Tactile Switch</span>
            <NeuToggle
              checked={toggleState}
              onChange={setToggleState}
              label={toggleState ? "Active: Email Alerts Enabled" : "Inactive: Alerts Silenced"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-[#8A8B82] uppercase font-semibold">Progress Bar</span>
            <NeuProgress value={88} label="Guardian Trust Rating" />
          </div>

          <div className="flex flex-col gap-2 items-start justify-center">
            <span className="text-xs text-[#8A8B82] uppercase font-semibold">Accessible Modal</span>
            <NeuButton variant="secondary" onClick={() => setIsModalOpen(true)}>
              <Eye className="w-4 h-4 mr-1.5 text-[#DD700B]" /> Trigger Accessible Modal
            </NeuButton>
          </div>
        </NeuCard>
      </section>

      {/* Test Modal */}
      <NeuModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Frozen Mist Modal Dialog"
        description="Features full backdrop blur, keyboard focus trapping, and Escape key dismissal."
      >
        <div className="flex flex-col gap-4 text-xs text-[#8A8B82] leading-relaxed">
          <p>
            This modal complies with WCAG AA accessibility standards. Users can close by pressing{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-[#1A1C1A] text-[#DD700B] font-mono">Esc</kbd> or clicking outside.
          </p>
          <div className="p-3 rounded-xl bg-[#242724] border border-[#8FD19E]/30 text-[#8FD19E] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Theme tokens validated across all interactive components.</span>
          </div>
          <div className="flex justify-end pt-2">
            <NeuButton variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Close Audit
            </NeuButton>
          </div>
        </div>
      </NeuModal>
    </div>
  );
}
