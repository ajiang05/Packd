import Link from "next/link";
import BottomNav from "../components/BottomNav";
import { PlusIcon } from "../components/icons";

// Placeholder data until trips are wired to the database.
const trips = [
  {
    id: "demo",
    name: "Amalfi Coast",
    dates: "Aug 12 – Aug 19",
    gradient: "from-orange-200 via-rose-200 to-sky-200",
    members: ["S", "J"],
    extra: 2,
  },
  {
    id: "tokyo",
    name: "Tokyo Adventure",
    dates: "Oct 05 – Oct 14",
    gradient: "from-pink-200 via-purple-200 to-indigo-200",
    members: ["A", "M"],
    extra: 0,
  },
  {
    id: "alps",
    name: "Swiss Alps",
    dates: "Dec 20 – Dec 27",
    gradient: "from-sky-200 via-slate-100 to-emerald-100",
    members: ["K"],
    extra: 0,
  },
];

export default function TripsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="w-full sticky top-0 z-40 bg-bg flex justify-between items-center px-edge py-md">
        <h1 className="text-2xl font-bold text-accent tracking-tight">Packd</h1>
        <div className="w-10 h-10 rounded-full bg-accent-tint border border-border flex items-center justify-center font-bold text-accent">
          S
        </div>
      </header>

      <main className="px-edge pt-sm pb-32 max-w-2xl mx-auto">
        <section className="mb-xl">
          <p className="font-medium text-ink-secondary">Welcome back, Sarah</p>
          <h2 className="text-[32px] font-bold text-ink mt-xs">Your Trips</h2>
        </section>

        <div className="space-y-lg">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}/activities`}
              className="group block relative bg-surface rounded-card overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-300 active:scale-[0.98]"
            >
              <div className="h-48 w-full relative overflow-hidden">
                <div
                  className={`w-full h-full bg-gradient-to-br ${trip.gradient} group-hover:scale-105 transition-transform duration-700`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              <div className="p-md flex justify-between items-end">
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {trip.name}
                  </h3>
                  <p className="text-[13px] text-ink-secondary mt-1">
                    {trip.dates}
                  </p>
                </div>
                <div className="flex -space-x-3">
                  {trip.members.map((initial) => (
                    <div
                      key={initial}
                      className="w-8 h-8 rounded-full border-2 border-surface bg-accent-tint flex items-center justify-center text-[11px] font-bold text-accent-dark"
                    >
                      {initial}
                    </div>
                  ))}
                  {trip.extra > 0 && (
                    <div className="w-8 h-8 rounded-full border-2 border-surface bg-accent-tint flex items-center justify-center text-[10px] font-bold text-accent">
                      +{trip.extra}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <button
        aria-label="New Trip"
        className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent-dark active:scale-90 transition-all duration-200"
      >
        <PlusIcon width={28} height={28} />
      </button>

      <BottomNav />
    </div>
  );
}
