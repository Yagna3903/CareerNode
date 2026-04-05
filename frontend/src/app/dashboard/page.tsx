"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Job, MatchOutput } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { JobSheet } from "@/components/JobSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, BriefcaseBusiness, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const PAGE_SIZE = 100;

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [matchResults, setMatchResults] = useState<Record<string, MatchOutput>>({});
  const [analysingId, setAnalysingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "relevance">("newest");
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
        if (!ctx.job_level_preference || !ctx.master_resume_text) {
          router.replace("/onboarding");
          return;
        }
        setJobLevel(ctx.job_level_preference || null);
        fetchJobs(page, ctx.job_level_preference || null);
      } catch {
        router.replace("/onboarding");
      }
    });
  }, [supabase.auth, router, fetchJobs, page]);

  useEffect(() => {
      if (userEmail) { 
         fetchJobs(page, jobLevel);
      }
  }, [page, userEmail, jobLevel, fetchJobs]);

  async function handleAnalyse(job: Job) {
    setAnalysingId(job.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const result = await api.match(job.id, session.access_token);
      setMatchResults(prev => ({ ...prev, [job.id]: result }));
      setSelectedJob(job);
      setSheetOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI analysis failed.";
      if (msg.includes("complete your profile")) {
        toast.error("Missing Resume", {
          description: msg,
          action: { label: "Upload", onClick: () => router.push("/onboarding") },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setAnalysingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === "relevance") {
      const scoreA = matchResults[a.id]?.ai_match_score || 0;
      const scoreB = matchResults[b.id]?.ai_match_score || 0;
      return scoreB - scoreA;
    } else {
      const dateA = a.posted_at_datetime ? new Date(a.posted_at_datetime).getTime() : (a.date_posted ? new Date(a.date_posted).getTime() : 0);
      const dateB = b.posted_at_datetime ? new Date(b.posted_at_datetime).getTime() : (b.date_posted ? new Date(b.date_posted).getTime() : 0);
      return dateB - dateA;
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-background relative isolate">
      {/* Unobtrusive ambient top glow for the hero that doesn't break legibility */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-purple-500/10 via-background/50 to-background pointer-events-none -z-10" />

      <Navbar jobCount={total} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12">

        {/* Cinematic Dashboard Header */}
        <div className="mb-10 text-center sm:text-left border-b border-border/50 pb-8 relative isolate">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[13px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Intelligence Grid
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-gradient max-w-xl">
            CareerNode Radar
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {userEmail ? <span className="font-semibold text-foreground">Signed in as {userEmail} <span className="text-border px-2">|</span> </span> : ""}
            Click <strong>AI Match</strong> on any role to immediately compute your ATS fitness and generate a targeted cover letter via Gemini.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
             <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "relevance")}>
                <SelectTrigger className="w-[140px] bg-card/80 backdrop-blur-sm h-10 border-border rounded-xl">
                   <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                   <SelectItem value="newest">Newest Listed</SelectItem>
                   <SelectItem value="relevance">Highest Match</SelectItem>
                </SelectContent>
             </Select>
             <Button
               size="sm"
               variant="outline"
               onClick={() => fetchJobs(page, jobLevel)}
               className="gap-2 h-10 px-4 rounded-xl bg-card/80 backdrop-blur-sm border-border hover:border-purple-500/30 transition-colors"
             >
               <RefreshCw className="w-4 h-4 text-muted-foreground" />
             </Button>
          </div>
          <p className="text-sm font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border">
            {jobs.length} of {total} listings
          </p>
        </div>

        {/* Job grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card/50 border border-border p-6 space-y-4">
                <Skeleton className="h-6 w-2/3 rounded-lg" />
                <Skeleton className="h-4 w-1/3 rounded-md" />
                <Skeleton className="h-14 w-full mt-4 rounded-xl" />
                <Skeleton className="h-10 w-full mt-6 rounded-xl" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-20 text-center max-w-2xl mx-auto mt-8 relative overflow-hidden isolate">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent -z-10" />
            <BriefcaseBusiness className="w-16 h-16 mx-auto text-muted-foreground/50 mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">No Active Listings</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Our ingestion workers are surveying the market grid. Please check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                score={matchResults[job.id]?.ai_match_score ?? null}
                onAnalyse={() => handleAnalyse(job)}
                onClickTitle={() => { setSelectedJob(job); setSheetOpen(true); }}
                analysing={analysingId === job.id}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 mt-12 pt-8 border-t border-border/50">
            <Button
              variant="outline"
              size="default"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-xl px-6 h-11 shadow-sm"
            >
              Previous Page
            </Button>
            <span className="text-sm font-semibold tracking-wide text-muted-foreground">
              {page} <span className="opacity-40">/</span> {totalPages}
            </span>
            <Button
              variant="outline"
              size="default"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-xl px-6 h-11 shadow-sm"
            >
              Next Page
            </Button>
          </div>
        )}
      </main>

      <JobSheet
        job={selectedJob}
        score={selectedJob ? (matchResults[selectedJob.id]?.ai_match_score ?? null) : null}
        coverLetter={selectedJob ? (matchResults[selectedJob.id]?.generated_cover_letter ?? null) : null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAnalyse={handleAnalyse}
        analysing={analysingId === selectedJob?.id}
      />
    </div>
  );
}
