"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Summary {
  records: number; institutes: number; branches: number; districts: number;
}

const FEATURES = [
  ["🎯", "Dual Prediction Modes", "Search by percentile or by rank — for both MH-CET (CAP) and JEE-Main."],
  ["🛡️", "Safety Zones", "See how safe each college is for your score, sorted best-first."],
  ["🏫", "Branch & District Filters", "Narrow across 100+ branches and every district."],
  ["📄", "PDF Reports", "Download a clean report of your personalised college list."],
];

function fmt(n: number) {
  return n > 0 ? n.toLocaleString("en-IN") : "—";
}

export default function Home() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api.summary().then((d) => setS(d as Summary)).catch(() => setS(null));
  }, []);

  return (
    <div className="bg-slate-950 text-white">
      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 inline-block rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold tracking-widest text-blue-200">
            ● ENGINEERING ADMISSIONS 2026 · AI-POWERED PREDICTION ENGINE
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">
            College Predictor 2026
            <span className="mt-2 block bg-gradient-to-r from-blue-300 via-purple-300 to-emerald-300 bg-clip-text text-transparent">
              Find Your Dream College
            </span>
            with Smart Analysis
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-white/70">
            Predict probable engineering colleges by percentile or rank. Filter
            by branch, category and district — backed by last year&apos;s CAP
            closing cutoffs for MH-CET and JEE-Main.
          </p>

          {/* Two separated prediction entry points */}
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/predict"
              className="rounded-xl bg-blue-600 px-8 py-4 font-semibold shadow-lg shadow-blue-900/40 transition hover:bg-blue-700">
              🎓 MH-CET Prediction
            </Link>
            <Link href="/jee"
              className="rounded-xl bg-purple-600 px-8 py-4 font-semibold shadow-lg shadow-purple-900/40 transition hover:bg-purple-700">
              🚀 JEE-Main Prediction
            </Link>
          </div>

          {/* Live stats */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ["Cutoff Records", s?.records ?? 0],
              ["Institutes", s?.institutes ?? 0],
              ["Branches", s?.branches ?? 0],
              ["Districts", s?.districts ?? 0],
            ].map(([label, n]) => (
              <div key={label as string}>
                <div className="text-3xl font-extrabold">{fmt(n as number)}</div>
                <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-slate-50 px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-3xl font-bold">
            Everything the engine gives you
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([icon, title, desc]) => (
              <div key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-3xl">{icon}</div>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
