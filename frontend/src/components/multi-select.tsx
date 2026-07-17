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
          <span className="text-brand-600">({selected.length} selected)</span>
        )}
      </label>
      <div className="rounded-lg border border-slate-300 dark:border-slate-700">
        <div className="flex items-center gap-2 border-b border-slate-200 p-2 dark:border-slate-700">
          <input
            className="w-full bg-transparent px-2 py-1 text-sm outline-none"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="btn-ghost text-xs"
            onClick={() => onChange([...options])}>All</button>
          <button type="button" className="btn-ghost text-xs"
            onClick={() => onChange([])}>Clear</button>
        </div>
        <div className="max-h-44 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-400">No matches.</p>
          ) : (
            filtered.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
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
