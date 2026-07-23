"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ResultsTable } from "@/components/results-table";
import { MultiSelect } from "@/components/multi-select";
import type { Meta, PredictResult } from "@/types";

/**
 * Full prediction experience for a single exam.
 * Rendered by /predict (MH-CET) and /jee (JEE-Main).
 */
export function PredictorForm({ exam }: { exam: "MH-CET" | "JEE-Main" }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const isMhtcet = exam === "MH-CET";
  const accent = isMhtcet ? "blue" : "purple";
  const FIELD =
    "w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [studentName, setStudentName] = useState("");
  const [mode, setMode] = useState<"percentile" | "rank">("percentile");
  const [value, setValue] = useState("90");
  const [gender, setGender] = useState("gender-neutral");
  const [homeDistrict, setHomeDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      setMeta((await api.meta()) as Meta);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (ready && !user) { router.push("/login"); return; }
    if (ready && user) loadMeta();
  }, [ready, user, router, loadMeta]);

  const em = meta?.by_exam[exam];

  function step(delta: number) {
    const cur = parseFloat(value) || 0;
    const next = mode === "percentile"
      ? Math.min(100, Math.max(0, +(cur + delta).toFixed(4)))
      : Math.max(0, Math.round(cur + delta * 100));
    setValue(String(next));
  }

  async function onPredict() {
    const num = parseFloat(value);
    if (!num || num <= 0) { toast.error("Enter a valid percentile or rank."); return; }
    if (mode === "percentile" && num > 100) { toast.error("Percentile must be 0–100."); return; }
    setLoading(true);
    try {
      const res = (await api.predict({
        student_name: studentName, exam, mode, value: num,
        category: isMhtcet ? category : "", branches, districts,
        gender: isMhtcet ? gender : "gender-neutral",
        home_district: isMhtcet ? homeDistrict : "",
      })) as PredictResult;
      setResult(res);
      if (res.count === 0) toast.info("No colleges matched these filters.");
      else toast.success(`Found ${res.count} probable colleges.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (!result?.prediction_id) return;
    try {
      await api.download(
        `/api/prediction/${result.prediction_id}/pdf`,
        `${exam}_Prediction_${result.prediction_id}.pdf`
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!ready) return null;

  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col bg-slate-950 text-slate-100 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 space-y-5 border-b border-slate-800 bg-slate-900/60 p-5 lg:w-96 lg:border-b-0 lg:border-r xl:w-[420px]">
        <h2 className="text-lg font-bold">Your Details</h2>

        <div>
          <label className="label">Enter Your Name</label>
          <input className={FIELD} value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Your full name" />
        </div>

        <div>
          <label className="label">Search By</label>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "percentile"}
                onChange={() => setMode("percentile")} /> Percentile
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "rank"}
                onChange={() => setMode("rank")} /> Merit Rank
            </label>
          </div>
        </div>

        <div>
          <label className="label">
            Your {exam} {mode === "percentile" ? "Percentile" : "Merit Rank"}
          </label>
          <div className="flex items-stretch gap-2">
            <input className={FIELD} type="number" value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "percentile" ? "e.g. 95.5" : "e.g. 15000"} />
            <button type="button" onClick={() => step(-1)}
              className="rounded-lg border border-slate-700 px-3 text-lg hover:bg-slate-800">−</button>
            <button type="button" onClick={() => step(1)}
              className="rounded-lg border border-slate-700 px-3 text-lg hover:bg-slate-800">+</button>
          </div>
        </div>

        {isMhtcet && (
          <div>
            <label className="label">Gender / Seat Type</label>
            <select className={`${FIELD} [&>option]:bg-slate-800 [&>option]:text-white`}
              value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="gender-neutral">Gender-Neutral</option>
              <option value="ladies">Female (Ladies)</option>
              <option value="any">Any</option>
            </select>
          </div>
        )}

        {isMhtcet && (
          <div>
            <label className="label">12th Pass District (Home University)</label>
            <select className={`${FIELD} [&>option]:bg-slate-800 [&>option]:text-white`}
              value={homeDistrict} onChange={(e) => setHomeDistrict(e.target.value)}>
              <option value="">— Select your 12th district —</option>
              {(meta?.home_districts ?? []).map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        )}

        {isMhtcet && (
          <div>
            <label className="label">Category</label>
            <select className={`${FIELD} [&>option]:bg-slate-800 [&>option]:text-white`} value={category}
              onChange={(e) => setCategory(e.target.value)}>
              <option value="">— Select category —</option>
              {(em?.categories ?? []).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}


        <MultiSelect label="Branch (select one or more)" options={em?.branches ?? []}
          selected={branches} onChange={setBranches}
          placeholder="Search branches…"
          hint="Empty = All Branches. Tick one or more." />

        <MultiSelect label="District (select one or more)" options={em?.districts ?? []}
          selected={districts} onChange={setDistricts}
          placeholder="Search districts…"
          hint="Empty = All Districts. Tick one or more." />

        <button onClick={onPredict} disabled={loading}
          className={`w-full rounded-lg px-4 py-3 font-semibold text-white transition disabled:opacity-50 ${
            accent === "blue"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-purple-600 hover:bg-purple-700"}`}>
          {loading ? "Predicting…" : "🔮 Predict Colleges"}
        </button>
      </aside>

      {/* Main */}
      <section className="flex-1 space-y-5 p-5 sm:p-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <span>🎓</span> {exam} College Predictor
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter your {mode} and filters to see which colleges you can get.
          </p>
        </div>

        {!result && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
            Set your details in the sidebar, then click <b>Predict Colleges</b>.
          </div>
        )}

        {result && result.home_university && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            Your Home University: <b>{result.home_university}</b>
          </div>
        )}

        {result && result.count > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                {result.count} colleges · {result.exam} · sorted best-first
              </p>
              <button className="btn" onClick={downloadPdf}>📄 Download PDF</button>
            </div>
            <ResultsTable data={result} variant="prediction" />
          </>
        )}

        {result && result.count === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm text-slate-300">
            No colleges matched these filters. Try widening branch/district or
            lowering your {mode}.
          </div>
        )}
      </section>
    </div>
  );
}
