"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const AUTH_PATHS = ["/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuthPage) {
    // Login (and any future auth pages) render full-screen with no sidebar
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
