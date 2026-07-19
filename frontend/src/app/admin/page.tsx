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

export default function AdminPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [win, setWin] = useState({ pct_upper_buffer: 2, rank_lower_buffer: 2000, rank_upper_buffer: 15000 });

  const load = useCallback(async () => {
    try {
      setStats((await api.stats()) as Stats);
      setUsers((await api.adminUsers(filter, search)) as AdminUser[]);
      setWin((await api.getWindow()) as typeof win);
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
      toast.success(`User ${action}d.`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function del(id: number) {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await api.deleteUser(id);
      toast.success("User deleted.");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function saveWindow() {
    try {
      await api.setWindow(win);
      toast.success("Prediction window updated.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {STAT_CARDS.map(([key, label]) => (
          <div key={key} className="card text-center">
            <div className="text-2xl font-bold text-brand-600">
              {stats ? stats[key] : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* prediction window */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Prediction Window</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Percentile buffer (+points)</label>
            <input className="input" type="number" step="0.1" value={win.pct_upper_buffer}
              onChange={(e) => setWin({ ...win, pct_upper_buffer: +e.target.value })} />
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
                      <button className="btn-ghost text-red-600" onClick={() => del(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No users.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
