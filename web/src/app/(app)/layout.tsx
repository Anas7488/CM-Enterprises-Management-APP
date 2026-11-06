"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { DateRangeProvider } from "@/lib/date-range-context";
import { Sidebar } from "@/shared/ui/Sidebar";
import { Header } from "@/shared/ui/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  // Desktop: sidebar collapsed vs expanded
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: sidebar drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <DateRangeProvider>
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        {/* Sidebar — hidden on mobile (drawer), visible on md+ */}
        <div className="hidden md:flex">
          <Sidebar
            open={true}
            collapsed={collapsed}
            onClose={() => {}}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </div>

        {/* Mobile sidebar drawer */}
        <div className="md:hidden">
          <Sidebar
            open={mobileOpen}
            collapsed={false}
            onClose={() => setMobileOpen(false)}
            onToggleCollapse={() => {}}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuToggle={() => setMobileOpen((o) => !o)} />
          <main
            className="
              flex-1 overflow-y-auto
              px-4 py-4
              md:px-6 md:py-6
              /* bottom padding on mobile for bottom nav bar */
              pb-20 md:pb-6
            "
          >
            {children}
          </main>
        </div>
      </div>
    </DateRangeProvider>
  );
}
