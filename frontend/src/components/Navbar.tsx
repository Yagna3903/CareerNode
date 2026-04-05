"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, LayoutDashboard, TerminalSquare } from "lucide-react";

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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center shadow-md border border-border">
              <TerminalSquare className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight text-lg text-foreground">CareerNode</span>
          </Link>
          {jobCount !== undefined && (
            <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase ml-2 bg-muted/50">
              {jobCount} Blocks
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isAuthPage && !isOnboarding && (
            <>
              {pathname !== "/dashboard" && (
                <Link href="/dashboard">
                  <Button size="sm" variant="ghost" className="gap-2 h-9 font-semibold text-muted-foreground hover:text-foreground">
                    <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Radar</span>
                  </Button>
                </Link>
              )}
              {pathname !== "/profile" && (
                <Link href="/profile">
                  <Button size="sm" variant="ghost" className="gap-2 h-9 font-semibold text-muted-foreground hover:text-foreground">
                    <User className="w-4 h-4" /> <span className="hidden sm:inline">Settings</span>
                  </Button>
                </Link>
              )}
            </>
          )}
          
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
          
          <ThemeToggle />
          
          {!isAuthPage && (
            <Button size="sm" variant="ghost" onClick={handleSignOut} className="gap-2 h-9 font-semibold text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Eject</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
