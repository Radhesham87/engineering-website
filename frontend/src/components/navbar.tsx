"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700 dark:text-brand-500">
          <span className="text-xl">🎓</span> Engineering Predictor
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user && (user.role === "user" || user.role === "admin") && (
            <>
              <Link href="/predict" className="hover:text-brand-600">Predict</Link>
              <Link href="/history" className="hover:text-brand-600">History</Link>
            </>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className="hover:text-brand-600">Admin</Link>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          )}
          {user ? (
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-600">Login</Link>
              <Link href="/register" className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
