"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ResultsTable } from "@/components/results-table";
import { MultiSelect } from "@/components/multi-select";
import type { Meta, PredictResult } from "@/types";

/** MH-CET College List — filter by gender / home university / category /
 *  branch / district. */
export function CollegeList() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const exam = "MH-CET";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [gender, setGender] = useState("gender-neutral");
  const [homeDistrict, setHomeDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);

  const FIELD =
    "w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

  const loadMeta = useCallback(async () => {
    try { setMeta((await api.meta()) as Meta); }
    catch (e) { toast.error((e as Error).message); }
  }, []);

  useEffect(() => {
    if (ready && !user) { router.push("/login"); return; }
    if (ready && user) loadMeta();
  }, [ready, user, router, loadMeta]);

  const em = meta?.by_exam[exam];

  async function showList() {
    setLoading(true);
    try {
      const res = (await api.colleges({
        exam, category, gender, home_district: homeDistrict,
        branches, districts,
      })) as PredictResult;
      setResult(res);
      if (res.count === 0) toast.info("No colleges matched these filters.");
      else toast.success(`Found ${res.count} colleges.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col bg-slate-950 text-slate-100 lg:flex-row">
      <aside className="w-full shrink-0 space-y-5 border-b border-slate-800 bg-slate-900/60 p-5 lg:w-96 lg:border-b-0 lg:border-r xl:w-[420px]">
        <h2 className="text-lg font-bold">College List Filters</h2>
        <p className="text-xs text-slate-400">MH-CET · leave a filter empty to include all.</p>

        <div>
          <label className="label">Gender / Seat Type</label>
          <select className={`${FIELD} [&>option]:bg-slate-800 [&>option]:text-white`}
            value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="gender-neutral">Gender-Neutral</option>
            <option value="ladies">Female (Ladies)</option>
            <option value="any">Any</option>
          </select>
        </div>

        <div>
          <label className="label">12th Pass District (Home University)</label>
          <select className={`${FIELD} [&>option]:bg-slate-800 [&>option]:text-white`}
            value={homeDistrict} onChange={(e) => setHomeDistrict(e.target.value)}>
            <option value="">— Select your 12th district —</option>
            {(meta?.home_districts ?? []).map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Category</label>
          <select className={`${FIELD} [&>option]:bg-slate-800 [&>option]:text-white`}
            value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">— All categories —</option>
            {(em?.categories ?? []).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>


        <MultiSelect label="Branch (select one or more)" options={em?.branches ?? []}
          selected={branches} onChange={setBranches}
          placeholder="Search branches…"
          hint="Empty = All Branches." />

        <MultiSelect label="District (select one or more)" options={em?.districts ?? []}
          selected={districts} onChange={setDistricts}
          placeholder="Search districts…"
          hint="Empty = All Districts." />

        <button onClick={showList} disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Loading…" : "📋 Show College List"}
        </button>
      </aside>

      <section className="flex-1 space-y-5 p-5 sm:p-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <span>🏫</span> MH-CET College List
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse colleges and their closing cutoffs by category, branch and district.
          </p>
        </div>

        {!result && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
            Choose your filters in the sidebar, then click <b>Show College List</b>.
          </div>
        )}

        {result && result.home_university && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            Your Home University: <b>{result.home_university}</b>
          </div>
        )}

        {result && result.count > 0 && (
          <>
            <p className="text-sm text-slate-400">
              {result.count} colleges · sorted by closing cutoff (highest first)
            </p>
            <ResultsTable data={result} />
          </>
        )}

        {result && result.count === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm text-slate-300">
            No colleges matched these filters. Try removing a filter.
          </div>
        )}
      </section>
    </div>
  );
}
