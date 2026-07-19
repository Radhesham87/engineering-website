"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
