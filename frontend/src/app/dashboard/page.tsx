"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Job, MatchOutput } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { AIPanel } from "@/components/AIPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, RefreshCw, BriefcaseBusiness } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const PAGE_SIZE = 20;

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [analysingId, setAnalysingId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ job: Job; result: MatchOutput } | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [jobLevel, setJobLevel] = useState<string | null>(null);

  const fetchJobs = useCallback(async (p: number, level: string | null) => {
    setLoading(true);
    try {
      const data = await api.getJobs(p, PAGE_SIZE, level || undefined);
      setJobs(data.items);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push("/login"); return; }
      setUserEmail(data.session.user.email ?? "");
      try {
        const ctx = await api.getUserContext(data.session.access_token);
        // Ensure they have completely finished onboarding
        if (!ctx.job_level_preference || !ctx.master_resume_text) {
          router.replace("/onboarding");
          return;
        }
        setJobLevel(ctx.job_level_preference || null);
        fetchJobs(page, ctx.job_level_preference || null);
      } catch {
        // Fallback for new users without a context setup yet
        // A 404 from the API signifies they have no profile mapping
        router.replace("/onboarding");
      }
    });
  }, [supabase.auth, router, fetchJobs, page]);

  // removed explicit useEffect on page since fetchJobs is called inside the session logic above
  // but to handle native page transitions we retain a specific hook
  
  useEffect(() => {
      if (userEmail) { // only trigger if we actually loaded the email previously
         fetchJobs(page, jobLevel);
      }
  }, [page, userEmail, jobLevel, fetchJobs]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleAnalyse(job: Job) {
    setAnalysingId(job.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const result = await api.match(job.id, session.access_token);
      setScores(prev => ({ ...prev, [job.id]: result.ai_match_score }));
      setAiResult({ job, result: { ...result, ats_score: result.ai_match_score } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI analysis failed.";
      if (msg.includes("master resume")) {
        toast.error("Upload your resume first.", {
          action: { label: "Profile", onClick: () => router.push("/profile") },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setAnalysingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <Navbar jobCount={total} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            GTA Tech Job Feed
          </h1>
          <p className="text-muted-foreground">
            {userEmail ? `Signed in as ${userEmail} · ` : ""}
            Click <strong>AI Match</strong> on any job to get your ATS score, tailored cover
            letter, and resume tweaks.
          </p>
        </div>

        {/* Refresh */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {jobs.length} of {total} jobs · Page {page}/{totalPages || 1}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchJobs(page, jobLevel)}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Job grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <BriefcaseBusiness className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No jobs yet</h3>
            <p className="text-sm text-muted-foreground">
              The ingestion worker runs every 6 hours. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                score={scores[job.id] ?? null}
                onAnalyse={() => handleAnalyse(job)}
                analysing={analysingId === job.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {/* AI Panel */}
      {aiResult && (
        <AIPanel
          jobTitle={aiResult.job.title}
          result={aiResult.result}
          onClose={() => setAiResult(null)}
        />
      )}
    </div>
  );
}
