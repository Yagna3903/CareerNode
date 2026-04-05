"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [resume, setResume] = useState("");
  const [education, setEducation] = useState(
    "Advanced Diploma in Computer Systems Technology – Information Systems Engineering"
  );
  const [jobLevel, setJobLevel] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setEmail(session.user.email ?? "");

      try {
        const resp = await fetch(`${API_URL}/api/user-context`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (resp.ok) {
          const ctx = await resp.json();
          setResume(ctx.master_resume_text ?? "");
          setEducation(ctx.education_background ?? education);
          setJobLevel(ctx.job_level_preference ?? "");
        }
      } catch {
        // first time user — no context yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const resp = await fetch(`${API_URL}/api/user-context`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          master_resume_text: resume, 
          education_background: education,
          job_level_preference: jobLevel
        }),
      });
      if (!resp.ok) throw new Error("Failed to save.");
      toast.success("Profile saved! Your dashboard will immediately filter based on your new Target Vector.");
    } catch {
      toast.error("Failed to save profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background relative isolate text-foreground">
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-purple-500/5 via-background/50 to-background pointer-events-none -z-10" />

      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-5 mb-10 pb-6 border-b border-border">
          <div className="w-14 h-14 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground font-medium text-sm">{email}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="rounded-2xl border border-border bg-card/50 p-8 space-y-8">
              
              <div className="space-y-4">
                <div>
                  <Label className="text-[15px] font-bold tracking-wide">Target Seniority Vector</Label>
                  <p className="text-[13px] font-medium text-muted-foreground mt-1 mb-4">
                    The Radar automatically filters out all Senior/Lead/Managerial roles when Entry Level or Internship is selected.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setJobLevel("Internship")}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${jobLevel === "Internship" ? "border-purple-500 bg-purple-500/5 shadow-md shadow-purple-500/10" : "border-border hover:border-border/80 hover:bg-card bg-background"}`}
                  >
                    <div className="font-extrabold mb-1 text-[14px]">Internship</div>
                    <div className="text-[12px] font-medium text-muted-foreground">Summer / Co-op block</div>
                  </div>
                  <div 
                    onClick={() => setJobLevel("Entry Level")}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${jobLevel === "Entry Level" ? "border-purple-500 bg-purple-500/5 shadow-md shadow-purple-500/10" : "border-border hover:border-border/80 hover:bg-card bg-background"}`}
                  >
                    <div className="font-extrabold mb-1 text-[14px]">Entry Level</div>
                    <div className="text-[12px] font-medium text-muted-foreground">0-2 years exposure</div>
                  </div>
                </div>
              </div>

              <Separator className="border-border/50" />

              <div className="space-y-3">
                <Label htmlFor="resume" className="text-[15px] font-bold tracking-wide">
                  Master Resume
                </Label>
                <p className="text-[13px] font-medium text-muted-foreground">
                  Paste your full resume text. Gemini will ingest this block structure for all rapid tailoring actions.
                </p>
                <textarea
                  id="resume"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  rows={18}
                  placeholder="Paste your full resume text here…"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono leading-[1.8] text-foreground/90 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y shadow-inner"
                  required
                />
              </div>

              <Separator className="border-border/50" />

              <div className="space-y-3">
                <Label htmlFor="education" className="text-[15px] font-bold tracking-wide">
                  Education Background
                </Label>
                <p className="text-[13px] font-medium text-muted-foreground">
                  Hardcoded metadata utilized specifically for cover letter introductory structures.
                </p>
                <textarea
                  id="education"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[14px] text-foreground/90 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none shadow-inner"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="h-11 px-8 rounded-xl font-bold tracking-wide shadow-md" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Synchronizing Context…" : "Save Protocol"}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
