import Link from "next/link";

const FEATURES = [
  ["🎯", "MH-CET & JEE-Main", "Predict by CAP percentile or JEE-Main percentile / rank."],
  ["🏫", "Branch & District Filters", "Narrow by any of 100+ branches and 40 districts."],
  ["📄", "PDF Reports", "Download a professional report of your college list."],
  ["🗂️", "Prediction History", "Every prediction is saved and re-downloadable."],
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-16 text-center text-white">
        <p className="mb-3 inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-semibold tracking-wide">
          MAHARASHTRA ENGINEERING ADMISSIONS · CAP
        </p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Find Your Engineering College
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/80">
          Predict probable engineering colleges from your MH-CET percentile or
          JEE-Main percentile / rank, filtered by branch, category, and
          district — backed by last year&apos;s CAP closing cutoffs.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/predict" className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50">
            Start Prediction
          </Link>
          <Link href="/register" className="rounded-lg border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">
            Create Account
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">
          Everything the portal gives you
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} className="card">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
