function LoadingCard() {
  return (
    <div className="rounded-[1.75rem] border border-white/60 bg-white/72 p-5 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 rounded-full bg-slate-200" />
        <div className="h-8 w-4/5 rounded-full bg-slate-200" />
        <div className="h-4 w-full rounded-full bg-slate-100" />
        <div className="h-4 w-2/3 rounded-full bg-slate-100" />
        <div className="grid grid-cols-2 gap-3 pt-3">
          <div className="h-[4.5rem] rounded-2xl bg-slate-100" />
          <div className="h-[4.5rem] rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="rounded-[2rem] border border-white/60 bg-white/72 p-6 shadow-[0_28px_90px_-48px_rgba(15,35,51,0.55)] backdrop-blur-xl sm:p-8">
        <div className="animate-pulse space-y-5">
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="h-12 max-w-3xl rounded-[1.2rem] bg-slate-200" />
          <div className="h-6 max-w-2xl rounded-full bg-slate-100" />
          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            <div className="h-32 rounded-[1.5rem] bg-slate-100" />
            <div className="h-32 rounded-[1.5rem] bg-slate-100" />
            <div className="h-32 rounded-[1.5rem] bg-slate-100" />
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </section>
    </main>
  );
}
