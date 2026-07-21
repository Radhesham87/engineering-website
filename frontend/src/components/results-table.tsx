"use client";

import type { PredictResult } from "@/types";

export function ResultsTable({ data }: { data: PredictResult }) {
  const showCat = data.show_category;
  const showHome = data.results.some((r) => r.home_type && r.home_type !== "-");
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-700 text-white">
          <tr>
            <th className="px-3 py-2">Sr.No</th>
            <th className="px-3 py-2">College Code</th>
            <th className="px-3 py-2">College Name</th>
            <th className="px-3 py-2">District</th>
            <th className="px-3 py-2">Branch</th>
            {showCat && <th className="px-3 py-2">Category</th>}
            <th className="px-3 py-2">Status</th>
            {showHome && <th className="px-3 py-2">University</th>}
            <th className="px-3 py-2">Cutoff Percentile</th>
            <th className="px-3 py-2">Cutoff Rank</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((r) => (
            <tr key={r.sr_no} className={
              r.priority
                ? "border-t border-amber-300/40 bg-amber-100 dark:bg-amber-500/15"
                : "border-t border-slate-100 odd:bg-slate-50 dark:border-slate-800 dark:odd:bg-slate-800/40"
            }>
              <td className="px-3 py-2">{r.sr_no}</td>
              <td className="px-3 py-2">{r.college_code}</td>
              <td className="px-3 py-2 font-medium">
                {r.priority && <span className="mr-1 text-amber-500" title="Priority institute">★</span>}
                {r.college_name}
              </td>
              <td className="px-3 py-2">{r.district}</td>
              <td className="px-3 py-2">{r.branch}</td>
              {showCat && <td className="px-3 py-2">{r.category}</td>}
              <td className="px-3 py-2">{r.status}</td>
              {showHome && (
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.home_type === "Home University" ? (
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Home University</span>
                  ) : r.home_type === "Other than Home University" ? (
                    <span className="text-slate-400">Other than Home</span>
                  ) : "-"}
                </td>
              )}
              <td className="px-3 py-2">
                {r.cutoff_percentile !== null ? r.cutoff_percentile.toFixed(4) : "-"}
              </td>
              <td className="px-3 py-2">
                {r.cutoff_rank !== null ? r.cutoff_rank.toLocaleString() : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
