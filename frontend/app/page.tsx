import Link from "next/link";

export default function Home() {
  return (
    <main className="grow flex flex-col items-center justify-center px-edge py-xl relative overflow-hidden">
      <div className="max-w-md w-full flex flex-col items-center text-center z-10">
        <div className="relative w-full aspect-[4/3] mb-xl">
          <div className="absolute inset-0 bg-accent-tint/30 rounded-[40px] rotate-3" />
          <div className="relative z-10 w-full h-full rounded-[40px] bg-accent-tint flex items-center justify-center text-7xl">
            🧳
          </div>
        </div>

        <div className="mb-md">
          <h2 className="text-[32px] font-bold text-accent tracking-tight">
            Packd
          </h2>
        </div>

        <div className="space-y-md mb-2xl">
          <h1 className="text-2xl font-bold text-ink">
            Plan trips together, minus the chaos.
          </h1>
          <p className="text-ink-secondary max-w-[280px] mx-auto">
            The minimalist group trip planner that feels like your favorite
            social apps.
          </p>
        </div>

        <div className="w-full flex flex-col gap-md">
          <Link
            href="/trips"
            className="w-full h-[56px] bg-accent text-white font-medium rounded-full hover:bg-accent-dark active:scale-95 transition-all flex items-center justify-center"
          >
            Get Started
          </Link>
          <Link
            href="/trips"
            className="w-full h-[56px] bg-surface border border-border text-ink font-medium rounded-full hover:bg-bg active:scale-95 transition-all flex items-center justify-center"
          >
            Log In
          </Link>
        </div>

        <div className="mt-xl">
          <p className="text-[13px] text-ink-secondary">
            By continuing, you agree to our{" "}
            <a className="underline" href="#">
              Terms of Service
            </a>
          </p>
        </div>
      </div>

      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent-tint/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
    </main>
  );
}
