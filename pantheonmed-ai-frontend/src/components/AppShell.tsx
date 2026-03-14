"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const AUTH_PATHS = ["/login"];

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p) ?? false);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </main>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}
