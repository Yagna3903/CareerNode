"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in!");
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative isolate">
      {/* Premium Cinematic Background */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-purple-500/10 via-background/50 to-background pointer-events-none -z-10" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-foreground text-background flex items-center justify-center text-xl font-bold tracking-tight shadow-md">
              CN
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your CareerNode account</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl transition-all">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-semibold text-foreground">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-lg"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm font-medium text-muted-foreground mt-8">
            No account?{" "}
            <Link href="/register" className="text-foreground hover:text-purple-500 underline underline-offset-4 decoration-border hover:decoration-purple-500 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
