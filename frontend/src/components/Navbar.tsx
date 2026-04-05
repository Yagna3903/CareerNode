"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, LayoutDashboard } from "lucide-react";

interface NavbarProps {
  jobCount?: number;
}

export function Navbar({ jobCount }: NavbarProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const pathname = usePathname();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isOnboarding = pathname === "/onboarding";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-md gradient-brand" />
            <span className="font-bold tracking-tight text-lg">CareerNode</span>
          </Link>
          {jobCount !== undefined && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {jobCount} jobs
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isAuthPage && !isOnboarding && (
            <>
              {pathname !== "/dashboard" && (
                <Link href="/dashboard">
                  <Button size="sm" variant="ghost" className="gap-1.5 h-8">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Button>
                </Link>
              )}
              {pathname !== "/profile" && (
                <Link href="/profile">
                  <Button size="sm" variant="ghost" className="gap-1.5 h-8">
                    <User className="w-4 h-4" /> Profile
                  </Button>
                </Link>
              )}
            </>
          )}
          
          <ThemeToggle />
          
          {!isAuthPage && (
            <Button size="sm" variant="ghost" onClick={handleSignOut} className="gap-1.5 h-8 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
