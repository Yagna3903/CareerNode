"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [resume, setResume] = useState("");
  const [education, setEducation] = useState(
    "Advanced Diploma in Computer Systems Technology – Information Systems Engineering"
  );
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
        body: JSON.stringify({ master_resume_text: resume, education_background: education }),
      });
      if (!resp.ok) throw new Error("Failed to save.");
      toast.success("Profile saved! You can now run AI Match on any job.");
    } catch {
      toast.error("Failed to save profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-7 h-7 rounded-md gradient-brand" />
          <span className="font-bold tracking-tight">Profile</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full gradient-brand glow-violet flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Your Profile</h1>
            <p className="text-muted-foreground text-sm">{email}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="resume" className="text-base font-semibold">
                  Master Resume
                </Label>
                <p className="text-sm text-muted-foreground">
                  Paste your full resume text. The AI will use this as the base for all
                  tailoring — include every bullet, project, and skill.
                </p>
                <textarea
                  id="resume"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  rows={18}
                  placeholder="Paste your full resume text here…"
                  className="w-full rounded-lg border border-border bg-input/50 px-3 py-2.5 text-sm font-mono leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  required
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="education" className="text-base font-semibold">
                  Education Background
                </Label>
                <p className="text-sm text-muted-foreground">
                  Used in the cover letter introduction.
                </p>
                <textarea
                  id="education"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-input/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <Button type="submit" className="w-full glow-violet gap-2" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
