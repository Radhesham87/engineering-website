"use client";

import { useMemo, useState } from "react";

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Search…",
  hint,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      q
        ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
        : options,
    [q, options]
  );

  function toggle(o: string) {
    onChange(
      selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]
    );
  }

  return (
    <div>
      <label className="label">
        {label} {selected.length > 0 && (
          <span className="text-blue-400">({selected.length} selected)</span>
        )}
      </label>
      <div className="rounded-lg border border-slate-700 bg-slate-800/70">
        <div className="flex items-center gap-2 border-b border-slate-700 p-2">
          <input
            className="w-full bg-transparent px-2 py-1 text-sm outline-none"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            onClick={() => onChange([...options])}>All</button>
          <button type="button" className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            onClick={() => onChange([])}>Clear</button>
        </div>
        <div className="max-h-44 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-400">No matches.</p>
          ) : (
            filtered.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200 hover:bg-slate-700">
                <input type="checkbox" checked={selected.includes(o)}
                  onChange={() => toggle(o)} />
                <span>{o}</span>
              </label>
            ))
          )}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
