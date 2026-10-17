"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { Briefcase, PlusCircle, ArrowRight, Calendar, Users } from "lucide-react";

// OWNER: M1 (frontend developer)
export default function HRJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHRJobs().then((data) => {
      setJobs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo variant="mark" size="md" href={null} />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#D9DADF]">Job Requisitions</h1>
            <p className="text-sm text-[#8A8B82] mt-1">Manage active listings, deadlines, candidate shortlists, and rubric specifications.</p>
          </div>
        </div>
        <Link href="/hr/jobs/new">
          <NeuButton variant="primary" size="md">
            <PlusCircle className="w-4 h-4 mr-1.5" /> Post New Job
          </NeuButton>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job) => (
          <NeuCard key={job.id} variant="raised" className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-[#DD700B]/40 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#242724] neu-inset flex items-center justify-center text-[#DD700B] shrink-0 mt-0.5">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <h3 className="text-lg font-bold text-[#D9DADF]">{job.title}</h3>
                  <NeuBadge status="applied" label={job.status} />
                </div>
                <p className="text-sm text-[#8A8B82]">{job.department || "General"} &bull; Created {new Date(job.created_at || Date.now()).toLocaleDateString()}</p>

                <div className="flex flex-wrap items-center gap-5 mt-3 text-sm text-[#8A8B82]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#DD700B]" />
                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#8FD19E]" />
                    Top {job.top_n} auto-invited (&ge; {job.min_score}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
              <Link href={`/jobs/${job.id}`} target="_blank">
                <NeuButton size="sm" variant="ghost">View Public Page</NeuButton>
              </Link>
              <Link href={`/hr/jobs/${job.id}`}>
                <NeuButton size="sm" variant="secondary">
                  Manage Candidates <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </NeuButton>
              </Link>
            </div>
          </NeuCard>
        ))}
      </div>
    </div>
  );
}
