"use client";

import { useState } from "react";
import BottomNav from "../../../components/BottomNav";
import { PlusIcon } from "../../../components/icons";

// Placeholder data until checklists are wired to the database.
const initialSections = [
  {
    trip: "Amalfi Coast",
    tag: "Active",
    tagActive: true,
    items: [
      { id: "sunscreen", label: "Pack sunscreen (SPF 50+)", checked: true },
      { id: "boarding", label: "Print boarding pass", checked: false },
      { id: "hotel", label: "Confirm hotel booking", checked: false },
    ],
  },
  {
    trip: "Tokyo Adventure",
    tag: "Upcoming",
    tagActive: false,
    items: [
      { id: "yen", label: "Exchange Yen (¥50,000)", checked: false },
      { id: "wifi", label: "Rent pocket Wi-Fi", checked: false },
      { id: "shoes", label: "Pack comfortable walking shoes", checked: true },
    ],
  },
];

export default function ChecklistPage() {
  const [sections, setSections] = useState(initialSections);

  function toggle(sectionIdx: number, itemId: string) {
    setSections((prev) =>
      prev.map((section, i) =>
        i === sectionIdx
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId
                  ? { ...item, checked: !item.checked }
                  : item,
              ),
            }
          : section,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="w-full sticky top-0 z-40 bg-bg flex justify-between items-center px-edge py-md">
        <h1 className="text-2xl font-bold text-accent tracking-tight">Packd</h1>
        <div className="w-10 h-10 rounded-full bg-accent-tint border border-border flex items-center justify-center font-bold text-accent">
          S
        </div>
      </header>

      <main className="px-edge mt-lg max-w-lg mx-auto">
        <div className="mb-xl">
          <h2 className="text-2xl font-bold text-ink">Checklist</h2>
        </div>

        {sections.map((section, sectionIdx) => (
          <section key={section.trip} className="mb-2xl">
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-lg font-semibold text-ink">{section.trip}</h3>
              <span
                className={`text-[11px] uppercase tracking-wide px-sm py-xs rounded-full ${
                  section.tagActive
                    ? "text-accent bg-accent-tint"
                    : "text-ink-secondary bg-border/60"
                }`}
              >
                {section.tag}
              </span>
            </div>
            <div className="bg-surface rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border">
              {section.items.map((item, itemIdx) => (
                <label
                  key={item.id}
                  className={`flex items-center p-md cursor-pointer hover:bg-bg transition-colors ${
                    itemIdx < section.items.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggle(sectionIdx, item.id)}
                    className="w-6 h-6 border-2 border-accent rounded-lg appearance-none checked:bg-accent transition-all relative shrink-0 after:content-['✓'] after:absolute after:text-white after:text-sm after:font-bold after:left-1/2 after:-translate-x-1/2 after:top-1/2 after:-translate-y-1/2 after:opacity-0 checked:after:opacity-100"
                  />
                  <span
                    className={`ml-md transition-all ${
                      item.checked
                        ? "text-ink-secondary line-through"
                        : "text-ink"
                    }`}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}

        <button className="w-full py-md border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-ink-secondary hover:text-accent hover:border-accent transition-all active:scale-[0.98]">
          <PlusIcon width={20} height={20} />
          <span className="font-medium">Add new item</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
