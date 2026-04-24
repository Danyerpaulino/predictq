export default function MarketDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="h-5 w-36 rounded-full bg-slate-200" />

      <section className="animate-pulse rounded-[2rem] border border-white/60 bg-white/72 p-6 sm:p-8">
        <div className="flex gap-3">
          <div className="h-6 w-16 rounded-full bg-slate-200" />
          <div className="h-5 w-32 rounded-full bg-slate-100" />
        </div>
        <div className="mt-5 h-10 w-3/4 rounded-xl bg-slate-200" />
        <div className="mt-4 h-20 w-2/3 rounded-xl bg-slate-100" />
        <div className="mt-8 grid grid-cols-4 gap-4">
          <div className="h-24 rounded-[1.25rem] bg-slate-100" />
          <div className="h-24 rounded-[1.25rem] bg-slate-100" />
          <div className="h-24 rounded-[1.25rem] bg-slate-100" />
          <div className="h-24 rounded-[1.25rem] bg-slate-100" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="animate-pulse rounded-[1.75rem] border border-white/60 bg-white/80 p-6">
          <div className="h-5 w-32 rounded-full bg-slate-200" />
          <div className="mt-6 h-72 rounded-2xl bg-slate-100" />
        </div>
        <div className="space-y-6">
          <div className="animate-pulse rounded-[1.75rem] border border-white/60 bg-white/80 p-5">
            <div className="h-4 w-24 rounded-full bg-slate-200" />
            <div className="mt-4 space-y-4">
              <div className="h-8 rounded-full bg-slate-100" />
              <div className="h-8 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
