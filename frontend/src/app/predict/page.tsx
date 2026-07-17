"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ResultsTable } from "@/components/results-table";
import { MultiSelect } from "@/components/multi-select";
import { EXAMS } from "@/lib/utils";
import type { Meta, PredictResult } from "@/types";

export default function PredictPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [meta, setMeta] = useState<Meta | null>(null);
  const [studentName, setStudentName] = useState("");
  const [exam, setExam] = useState("MH-CET");
  const [mode, setMode] = useState<"percentile" | "rank">("percentile");
  const [value, setValue] = useState("");
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

  // reset exam-specific selections when exam changes
  useEffect(() => {
    setBranches([]); setDistricts([]); setCategory(""); setResult(null);
  }, [exam]);

  const em = meta?.by_exam[exam];
  const isMhtcet = exam === "MH-CET";

  function clearForm() {
    setStudentName(""); setValue(""); setCategory("");
    setBranches([]); setDistricts([]); setResult(null);
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
        `Engineering_Prediction_${result.prediction_id}.pdf`
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!ready) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Predict Engineering Colleges</h1>
      <p className="text-sm text-slate-500">
        MH-CET &amp; JEE-Main · based on last year&apos;s CAP closing cutoffs.
      </p>

      <div className="card grid gap-5 md:grid-cols-2">
        <div>
          <label className="label">Student Name</label>
          <input className="input" value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Your full name" />
        </div>

        <div>
          <label className="label">Exam</label>
          <select className="input" value={exam}
            onChange={(e) => setExam(e.target.value)}>
            {EXAMS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Search By</label>
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "percentile"}
                onChange={() => setMode("percentile")} /> Percentile
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "rank"}
                onChange={() => setMode("rank")} /> Rank
            </label>
          </div>
        </div>

        <div>
          <label className="label">
            {mode === "percentile" ? "Your Percentile (0–100)" : "Your Rank"}
          </label>
          <input className="input" type="number" value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "percentile" ? "e.g. 95.5" : "e.g. 15000"} />
        </div>

        {isMhtcet && (
          <div>
            <label className="label">Category (CAP)</label>
            <select className="input" value={category}
              onChange={(e) => setCategory(e.target.value)}>
              <option value="">— Select category —</option>
              {(em?.categories ?? []).map((c) => <option key={c}>{c}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Maharashtra CAP codes (e.g. GOPENS, GSCS, GOBCS, EWS…).
            </p>
          </div>
        )}

        <div className={isMhtcet ? "" : "md:col-span-2"}>
          <MultiSelect label="Branch" options={em?.branches ?? []}
            selected={branches} onChange={setBranches}
            placeholder="Search branches…"
            hint="Leave empty to include all branches." />
        </div>

        <div className="md:col-span-2">
          <MultiSelect label="District" options={em?.districts ?? []}
            selected={districts} onChange={setDistricts}
            placeholder="Search districts…"
            hint="Leave empty to include all districts." />
        </div>

        <div className="flex gap-3 md:col-span-2">
          <button className="btn" onClick={onPredict} disabled={loading}>
            {loading ? "Predicting…" : "🔮 Predict"}
          </button>
          <button className="btn-ghost" onClick={clearForm}>Clear</button>
        </div>
      </div>

      {result && result.count > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {result.count} colleges · {result.exam} · sorted best-first
            </p>
            <button className="btn" onClick={downloadPdf}>📄 Download PDF</button>
          </div>
          <ResultsTable data={result} />
        </div>
      )}
    </div>
  );
}
