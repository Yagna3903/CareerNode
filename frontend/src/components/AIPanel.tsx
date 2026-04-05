"use client";

import { useState } from "react";
import { MatchOutput, ResumeTweak } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, X, Sparkles, FileText, Zap } from "lucide-react";
import { toast } from "sonner";

interface AIPanelProps {
  jobTitle: string;
  result: MatchOutput;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

function ScoreRing({ score }: { score: number }) {
  const colour =
    score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
        <circle
          cx="44" cy="44" r="36"
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: colour }}>{score}</span>
        <span className="text-[10px] text-muted-foreground">ATS Score</span>
      </div>
    </div>
  );
}

export function AIPanel({ jobTitle, result, onClose }: AIPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-2xl bg-card border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold leading-tight">AI Analysis</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[320px]">{jobTitle}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ATS Score */}
          <div className="flex items-center gap-5 rounded-xl bg-secondary/50 p-4 border border-border">
            <ScoreRing score={result.ats_score} />
            <div>
              <h3 className="font-semibold text-lg">
                {result.ats_score >= 75
                  ? "Strong Match"
                  : result.ats_score >= 50
                  ? "Moderate Match"
                  : "Weak Match"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {result.ats_score >= 75
                  ? "Your profile aligns well — apply with confidence."
                  : result.ats_score >= 50
                  ? "Tailor your resume with the tweaks below."
                  : "Significant gaps — use the cover letter to compensate."}
              </p>
            </div>
          </div>

          <Separator />

          {/* Cover Letter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Cover Letter</h3>
              </div>
              <CopyButton text={result.cover_letter} />
            </div>
            <div className="rounded-lg bg-secondary/40 border border-border p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {result.cover_letter}
              </p>
            </div>
          </div>

          <Separator />

          {/* Resume Tweaks */}
          {result.resume_tweaks && result.resume_tweaks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Resume Tweaks</h3>
                <Badge variant="secondary" className="text-xs">{result.resume_tweaks.length}</Badge>
              </div>
              <div className="space-y-3">
                {result.resume_tweaks.map((tweak: ResumeTweak, i: number) => (
                  <div key={i} className="rounded-lg bg-secondary/40 border border-border p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-relaxed flex-1">{tweak.bullet}</p>
                      <CopyButton text={tweak.bullet} />
                    </div>
                    <p className="text-xs text-muted-foreground border-t border-border pt-2">
                      <span className="text-primary font-medium">Why: </span>
                      {tweak.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
