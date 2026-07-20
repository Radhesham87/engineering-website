"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AdminUser, Stats } from "@/types";

const STAT_CARDS: [keyof Stats, string][] = [
  ["total_users", "Total Users"],
  ["pending_users", "Pending"],
  ["approved_users", "Approved"],
  ["rejected_users", "Rejected"],
  ["total_predictions", "Predictions"],
  ["todays_predictions", "Today"],
  ["total_downloads", "Downloads"],
];

type Win = {
  pct_upper_buffer: number; pct_lower_buffer: number;
  rank_lower_buffer: number; rank_upper_buffer: number;
  priority_institutes: string;
};

export default function AdminPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [win, setWin] = useState<Win>({
    pct_upper_buffer: 2, pct_lower_buffer: 10,
    rank_lower_buffer: 2000, rank_upper_buffer: 15000,
    priority_institutes: "16006, 3012, 6271, 3215, 3119, 6273, 6276, 6175, 6007, 6072",
  });

  const load = useCallback(async () => {
    try {
      setStats((await api.stats()) as Stats);
      setUsers((await api.adminUsers(filter, search)) as AdminUser[]);
      setWin((await api.getWindow()) as Win);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [filter, search]);

  useEffect(() => {
    if (ready && (!user || user.role !== "admin")) { router.push("/login"); return; }
    if (ready && user?.role === "admin") load();
  }, [ready, user, router, load]);

  async function act(id: number, action: string) {
    try {
      await api.userAction(id, action);
      toast.success(`Done: ${action}.`);
      load();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function del(id: number) {
    if (!confirm("Delete this user permanently?")) return;
    try { await api.deleteUser(id); toast.success("User deleted."); load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function saveWindow() {
    try { await api.setWindow(win); toast.success("Prediction window updated."); }
    catch (e) { toast.error((e as Error).message); }
  }

  if (!ready) return null;

  const a = stats?.approved_users ?? 0;
  const p = stats?.pending_users ?? 0;
  const r = stats?.rejected_users ?? 0;
  const tot = a + p + r || 1;
  const aDeg = (a / tot) * 360;
  const pDeg = ((a + p) / tot) * 360;
  const donut = `conic-gradient(#22c55e 0 ${aDeg}deg, #f59e0b ${aDeg}deg ${pDeg}deg, #ef4444 ${pDeg}deg 360deg)`;

  const todayByExam = Object.entries(stats?.by_exam_today ?? {});
  const totalByExam = Object.entries(stats?.by_exam_total ?? {});
  const maxUsage = Math.max(1, ...totalByExam.map(([, n]) => n));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {STAT_CARDS.map(([key, label]) => (
          <div key={key} className="card text-center">
            <div className="text-2xl font-bold text-brand-600">
              {stats ? (stats[key] as number) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* predictions by exam + usage bars + status donut */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="font-semibold">Today&apos;s Predictions by Exam</h2>
          <div className="grid grid-cols-2 gap-3">
            {(todayByExam.length ? todayByExam : [["MH-CET", 0], ["JEE-Main", 0]] as [string, number][])
              .map(([exam, n]) => (
              <div key={exam} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center">
                <div className="text-xl font-bold">{n}</div>
                <div className="text-xs text-slate-400">{exam}</div>
              </div>
            ))}
          </div>
          <h3 className="pt-2 text-sm font-semibold text-slate-300">Exam usage (all users)</h3>
          <div className="space-y-2">
            {(totalByExam.length ? totalByExam : [["MH-CET", 0], ["JEE-Main", 0]] as [string, number][])
              .map(([exam, n]) => (
              <div key={exam} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-slate-400">{exam}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-slate-800">
                  <div className="h-full rounded bg-blue-500"
                    style={{ width: `${(n / maxUsage) * 100}%` }} />
                </div>
                <span className="w-12 text-right font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Users by status</h2>
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0 rounded-full"
              style={{ background: donut }}>
              <div className="absolute inset-4 rounded-full bg-slate-900" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-green-500" /> Approved <b>{a}</b></div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-500" /> Pending <b>{p}</b></div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-red-500" /> Rejected <b>{r}</b></div>
            </div>
          </div>
        </div>
      </div>

      {/* prediction window */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Prediction Window</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Percentile buffer (+points)</label>
            <input className="input" type="number" step="0.1" value={win.pct_upper_buffer}
              onChange={(e) => setWin({ ...win, pct_upper_buffer: +e.target.value })} />
          </div>
          <div>
            <label className="label">Percentile buffer (−points)</label>
            <input className="input" type="number" step="0.1" value={win.pct_lower_buffer}
              onChange={(e) => setWin({ ...win, pct_lower_buffer: +e.target.value })} />
          </div>
          <div>
            <label className="label">JEE rank lower buffer (−rank)</label>
            <input className="input" type="number" value={win.rank_lower_buffer}
              onChange={(e) => setWin({ ...win, rank_lower_buffer: +e.target.value })} />
          </div>
          <div>
            <label className="label">JEE rank upper buffer (+rank)</label>
            <input className="input" type="number" value={win.rank_upper_buffer}
              onChange={(e) => setWin({ ...win, rank_upper_buffer: +e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Priority institute codes (comma separated, pinned in order)</label>
          <input className="input" placeholder="e.g. 16006, 3012, 6271, 3215"
            value={win.priority_institutes}
            onChange={(e) => setWin({ ...win, priority_institutes: e.target.value })} />
          <p className="mt-1 text-xs text-slate-400">These colleges appear pinned at the top of every prediction and in the PDF.</p>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          −points limits how far below a student&apos;s percentile colleges appear (100 = no limit).
        </p>
        <button className="btn mt-4" onClick={saveWindow}>Save Window</button>
      </div>

      {/* exports */}
      <div className="flex flex-wrap gap-3">
        <button className="btn-ghost"
          onClick={() => api.download("/api/admin/export/users", "Registered_Users.xlsx")}>
          ⬇ Export Users (Excel)
        </button>
        <button className="btn-ghost"
          onClick={() => api.download("/api/admin/export/predictions", "Predictions.xlsx")}>
          ⬇ Export Predictions (Excel)
        </button>
      </div>

      {/* users */}
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Users</h2>
          <select className="input max-w-[160px]" value={filter}
            onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input className="input max-w-[220px]" placeholder="Search name / email"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">City/State</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Predictions</th>
                <th className="px-3 py-2">Registered</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{u.mobile || "—"}</td>
                  <td className="px-3 py-2">{[u.city, u.state].filter(Boolean).join(", ")}</td>
                  <td className="px-3 py-2">
                    <span className={
                      u.status === "approved" ? "text-green-600"
                        : u.status === "rejected" ? "text-red-600"
                        : "text-amber-600"
                    }>{u.status}</span>
                  </td>
                  <td className="px-3 py-2">{u.is_active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    {u.session_active
                      ? <span className="text-green-500">● Active</span>
                      : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-3 py-2">{u.prediction_count}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {u.status !== "approved" &&
                        <button className="btn-ghost text-green-600" onClick={() => act(u.id, "approve")}>Approve</button>}
                      {u.status !== "rejected" &&
                        <button className="btn-ghost text-red-600" onClick={() => act(u.id, "reject")}>Reject</button>}
                      {u.is_active
                        ? <button className="btn-ghost" onClick={() => act(u.id, "disable")}>Disable</button>
                        : <button className="btn-ghost" onClick={() => act(u.id, "enable")}>Enable</button>}
                      {u.session_active &&
                        <button className="btn-ghost text-amber-500" onClick={() => act(u.id, "logout")}>Force logout</button>}
                      <button className="btn-ghost text-red-600" onClick={() => del(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No users.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
