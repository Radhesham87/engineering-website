"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-slate-600 transition hover:text-blue-700">
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="text-xl">🎓</span>
          <span>Engineering <span className="text-blue-700">Predictor</span></span>
        </Link>

        <div className="flex items-center gap-5 text-sm font-medium">
          <NavLink href="/#features">Features</NavLink>
          {user && (
            <>
              <NavLink href="/predict">MH-CET</NavLink>
              <NavLink href="/jee">JEE Main</NavLink>
              <NavLink href="/colleges">College List</NavLink>
              <NavLink href="/history">History</NavLink>
            </>
          )}
          {user?.role === "admin" && <NavLink href="/admin">Admin</NavLink>}

          {user ? (
            <>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {user.name || "Account"}
              </span>
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login">Login</NavLink>
              <Link href="/register"
                className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
