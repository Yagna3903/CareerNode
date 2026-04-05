"use client";

import { Job } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, Calendar, ExternalLink, Sparkles } from "lucide-react";

interface JobCardProps {
  job: Job;
  score?: number | null;
  onAnalyse: (job: Job) => void;
  analysing: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : score >= 50
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-red-500/20 text-red-300 border-red-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      ATS {score}%
    </span>
  );
}

export function JobCard({ job, score, onAnalyse, analysing }: JobCardProps) {
  const posted = job.date_posted
    ? new Date(job.date_posted).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 card-hover flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground leading-tight truncate" title={job.title}>
            {job.title}
          </h3>
          {job.company && (
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{job.company}</span>
            </div>
          )}
        </div>
        {score != null && <ScoreBadge score={score} />}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {job.location}
          </span>
        )}
        {posted && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {posted}
          </span>
        )}
      </div>

      {/* Description preview */}
      {job.description && (
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {job.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <Button
          size="sm"
          onClick={() => onAnalyse(job)}
          disabled={analysing}
          className="flex-1 glow-violet gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {analysing ? "Analysing…" : "AI Match"}
        </Button>
        {job.posting_url && (
          <a
            href={job.posting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-transparent hover:bg-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
