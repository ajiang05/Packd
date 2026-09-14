import BottomNav from "../../../components/BottomNav";
import { CheckIcon } from "../../../components/icons";

// Placeholder data until budget is wired to the database.
const budget = {
  trip: "Amalfi Coast",
  total: 2400,
  perPerson: 600,
  contributed: 1850,
};

const members = [
  { name: "Sarah J.", note: "Paid Full Share", amount: 600, paid: true },
  { name: "Mike R.", note: "Partial Contribution", amount: 450, paid: false, pending: 150 },
  { name: "Josh T.", note: "Paid Full Share", amount: 600, paid: true },
  { name: "Alex K.", note: "Partial Contribution", amount: 200, paid: false, pending: 400 },
];

export default function BudgetPage() {
  const pct = Math.round((budget.contributed / budget.total) * 100);
  const remaining = budget.total - budget.contributed;

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="w-full sticky top-0 z-40 bg-bg flex justify-between items-center px-edge py-md">
        <h1 className="text-2xl font-bold text-accent tracking-tight">Packd</h1>
        <div className="w-10 h-10 rounded-full bg-accent-tint border border-border flex items-center justify-center font-bold text-accent">
          S
        </div>
      </header>

      <main className="px-edge max-w-lg mx-auto">
        <div className="mt-md mb-xl">
          <div className="flex items-center gap-2 text-ink-secondary text-[11px] uppercase tracking-widest">
            <span>{budget.trip}</span>
            <span className="w-1 h-1 rounded-full bg-ink-secondary/30" />
            <span className="text-accent">Budget</span>
          </div>
        </div>

        <section className="mb-xl text-center">
          <div className="text-[13px] text-ink-secondary mb-xs">
            Total Estimated Budget
          </div>
          <div className="text-[48px] font-extrabold text-accent leading-tight mb-xs">
            ${budget.total.toLocaleString()}
          </div>
          <div className="font-medium text-ink-secondary mb-lg">
            ${budget.perPerson} <span className="opacity-60">/ person</span>
          </div>

          <div className="bg-surface p-lg rounded-card shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-end mb-sm">
              <div className="text-left">
                <div className="text-[11px] uppercase tracking-wide text-ink-secondary mb-1">
                  Contributed
                </div>
                <div className="text-2xl font-bold text-ink">
                  ${budget.contributed.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-ink-secondary mb-1">
                  Target
                </div>
                <div className="font-medium text-ink">
                  ${budget.total.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="h-3 w-full bg-accent-tint rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-md flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-tint text-accent text-[10px] uppercase tracking-wide rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                ${remaining} remaining
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-lg font-semibold text-ink">Trip Members</h2>
            <button className="text-accent font-medium text-[13px] hover:underline">
              Split Details
            </button>
          </div>
          <div className="space-y-md">
            {members.map((m) => (
              <div
                key={m.name}
                className="flex items-center justify-between p-md bg-surface rounded-card shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 rounded-full bg-accent-tint border border-border flex items-center justify-center font-bold text-accent-dark">
                    {m.name[0]}
                  </div>
                  <div>
                    <div className="font-medium text-ink">{m.name}</div>
                    <div className="text-[13px] text-ink-secondary">
                      {m.note}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div
                    className={`font-medium flex items-center gap-1 ${
                      m.paid ? "text-success" : "text-accent"
                    }`}
                  >
                    {m.paid && <CheckIcon width={16} height={16} />}${m.amount}
                  </div>
                  <div className="text-[10px] uppercase text-ink-secondary opacity-60">
                    {m.paid ? "Paid" : `Pending $${m.pending}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
