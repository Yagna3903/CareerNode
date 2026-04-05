"use client";

import { Job } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, ExternalLink, Sparkles, Clock } from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";

interface JobCardProps {
  job: Job;
  score?: number | null;
  onAnalyse: (job: Job) => void;
  onClickTitle?: () => void;
  analysing: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : score >= 50
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border shrink-0 ${color}`}>
      {score}% Match
    </span>
  );
}

export function JobCard({ job, score, onAnalyse, onClickTitle, analysing }: JobCardProps) {
  let postedText: React.ReactNode = null;

  if (job.posted_at_datetime) {
    try {
      const date = new Date(job.posted_at_datetime);
      if (differenceInHours(new Date(), date) < 24) {
        postedText = "Posted today";
      } else {
        postedText = formatDistanceToNow(date, { addSuffix: true });
      }
    } catch {
      postedText = "Recently posted";
    }
  } else if (job.date_posted) {
    postedText = new Date(job.date_posted).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="group relative flex flex-col rounded-2xl bg-card border border-border shadow-sm hover:shadow-2xl hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden isolate">
      
      {/* Premium subtle bottom flare */}
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex flex-col gap-5 p-6 flex-1 bg-gradient-to-br from-transparent to-muted/30">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Minimalist Urgency Badges with Pulse */}
            {(job.is_actively_recruiting || job.is_immediate_hire) && (
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${job.is_immediate_hire
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className={`animate-ping absolute inset-0 rounded-full opacity-75 ${job.is_immediate_hire ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className={`relative rounded-full h-1.5 w-1.5 ${job.is_immediate_hire ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </span>
                  {job.is_immediate_hire ? 'Immediate Hire' : 'Actively Hiring'}
                </span>
              </div>
            )}

            <h3
              className="text-lg font-bold text-foreground leading-snug cursor-pointer hover:underline underline-offset-4 decoration-border transition-all line-clamp-2"
              title={job.title}
              onClick={onClickTitle}
            >
              {job.title}
            </h3>

            {job.company && (
              <div className="flex items-center gap-2 mt-2 text-[13px] text-muted-foreground font-medium">
                <Building2 className="w-4 h-4 shrink-0 opacity-70" />
                <span className="truncate">{job.company}</span>
              </div>
            )}
          </div>
          {score != null && <ScoreBadge score={score} />}
        </div>

        {/* Technical Meta Row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-auto pt-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {job.location && (
            <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-border">
              <MapPin className="w-3.5 h-3.5 opacity-60" /> {job.location}
            </span>
          )}
          {postedText && (
            <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-border">
              <Clock className="w-3.5 h-3.5 opacity-60" /> {postedText}
            </span>
          )}
        </div>
      </div>

      {/* Floating Action Footer */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-card/50 backdrop-blur-md">
        <Button
          size="sm"
          onClick={() => onAnalyse(job)}
          disabled={analysing}
          className="flex-1 font-bold tracking-wide gap-2 shadow-none rounded-xl bg-purple-600 hover:bg-purple-700 text-white dark:text-white"
        >
          <Sparkles className="w-4 h-4" />
          {score ? "Re-Analyze Fit" : analysing ? "Analysing…" : "AI Match"}
        </Button>
        {job.posting_url && (
          <a
            href={job.posting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-9 w-9 shrink-0 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
