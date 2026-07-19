"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface HistoryRow {
  id: number; created_at: string; student_name: string; exam: string;
  mode: string; value: number; category: string; branches: string[];
  districts: string[]; count: number;
}

export default function HistoryPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows((await api.history()) as HistoryRow[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && !user) { router.push("/login"); return; }
    if (ready && user) load();
  }, [ready, user, router, load]);

  async function remove(id: number) {
    try {
      await api.deleteHistory(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Deleted.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function downloadPdf(id: number) {
    try {
      await api.download(`/api/prediction/${id}/pdf`, `NEET_Prediction_${id}.pdf`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Your Prediction History</h1>
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">No predictions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Exam</th>
                <th className="px-3 py-2">Input</th>
                <th className="px-3 py-2">Options</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.student_name || "-"}</td>
                  <td className="px-3 py-2">{r.exam}</td>
                  <td className="px-3 py-2">
                    {r.mode === "percentile" ? "Pctile" : "Rank"} {r.value}
                  </td>
                  <td className="px-3 py-2">{r.count}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => downloadPdf(r.id)}>PDF</button>
                      <button className="btn-ghost text-red-600" onClick={() => remove(r.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
