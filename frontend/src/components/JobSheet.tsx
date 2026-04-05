"use client";

import { Job } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, ExternalLink, Sparkles, CalendarDays } from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";

interface JobSheetProps {
  job: Job | null;
  score: number | null;
  coverLetter: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyse: (job: Job) => void;
  analysing: boolean;
}

export function JobSheet({ job, score, coverLetter, open, onOpenChange, onAnalyse, analysing }: JobSheetProps) {
  if (!job) return null;

  let postedText = "";
  if (job.posted_at_datetime) {
    try {
      const d = new Date(job.posted_at_datetime);
      postedText = differenceInHours(new Date(), d) < 24
        ? "Posted today"
        : formatDistanceToNow(d, { addSuffix: true });
    } catch { /* noop */ }
  } else if (job.date_posted) {
    postedText = new Date(job.date_posted).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
  }

  const scoreColor = score == null ? "" :
    score >= 75 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
    score >= 50 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 border-l border-border bg-background shadow-2xl">
        
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <SheetHeader className="text-left px-8 pt-10 pb-8 border-b border-border space-y-6 relative isolate bg-muted/10">
            {/* Subtle glow underneath the header title */}
            <div className="absolute inset-x-0 bottom-0 h-[100px] bg-gradient-to-t from-purple-500/5 to-transparent -z-10 pointer-events-none" />

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {job.company && (
                <span className="flex items-center gap-1.5 text-foreground bg-muted px-2.5 py-1 rounded border border-border">
                  <Building2 className="w-3.5 h-3.5 opacity-60" /> {job.company}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded border border-border">
                  <MapPin className="w-3.5 h-3.5 opacity-60" /> {job.location}
                </span>
              )}
              {postedText && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded border border-border">
                  <CalendarDays className="w-3.5 h-3.5 opacity-60" /> {postedText}
                </span>
              )}
            </div>

            <SheetTitle className="text-3xl font-extrabold text-foreground leading-tight tracking-tight">
              {job.title}
            </SheetTitle>

            {/* Urgency + score */}
            <div className="flex flex-wrap items-center gap-3">
              {(job.is_actively_recruiting || job.is_immediate_hire) && (
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase border ${job.is_immediate_hire
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className={`animate-ping absolute inset-0 rounded-full opacity-75 ${job.is_immediate_hire ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className={`relative rounded-full h-1.5 w-1.5 ${job.is_immediate_hire ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </span>
                  {job.is_immediate_hire ? 'Immediate Hire' : 'Actively Hiring'}
                </span>
              )}
              {score != null && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs tracking-widest uppercase font-bold border ${scoreColor}`}>
                  {score}% Target Fit
                </span>
              )}
            </div>
          </SheetHeader>

          <div className="px-8 py-8 space-y-10">
            {/* AI cover letter output element */}
            {coverLetter && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" /> AI Cover Letter
                </h3>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative isolate">
                  {/* Internal ambient glow */}
                  <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-purple-500/10 blur-[50px] -z-10 rounded-full pointer-events-none" />
                  <p className="text-[15px] font-medium text-foreground/90 leading-[1.8] whitespace-pre-wrap">
                    {coverLetter}
                  </p>
                </div>
              </div>
            )}

            {/* Original Job Description Block */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                About the Role
              </h3>
              <div className="prose prose-zinc dark:prose-invert max-w-none text-foreground/80 leading-[1.8] whitespace-pre-wrap">
                {job.description || "No description provided."}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-4 px-8 py-5 border-t border-border bg-background/80 backdrop-blur-xl">
          <Button
            size="lg"
            className="flex-1 font-bold tracking-wide gap-2 rounded-xl shadow-lg bg-foreground text-background hover:bg-foreground/90 transition-all h-12"
            onClick={() => job.posting_url && window.open(job.posting_url, '_blank')}
            disabled={!job.posting_url}
          >
            <ExternalLink className="w-4 h-4" />
            Apply Directly
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onAnalyse(job)}
            disabled={analysing}
            className="flex-1 font-bold tracking-wide gap-2 rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all h-12"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            {analysing ? "Analysing…" : score ? "Re-evaluate Fit" : "AI Match"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
