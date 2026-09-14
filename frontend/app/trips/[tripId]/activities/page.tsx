"use client";

import { useState } from "react";
import BottomNav from "../../../components/BottomNav";
import { CheckIcon, XIcon } from "../../../components/icons";

// Placeholder data until activities are wired to the database.
const activities = [
  {
    id: "boat",
    title: "Private Boat Tour",
    desc: "Experience the Amalfi Coast from the water with a private skipper. Includes prosecco and swimming stops.",
    price: "$$",
    duration: "4 hours",
    location: "Positano",
    contributor: "Sarah J.",
    votes: 3,
    gradient: "from-sky-300 via-cyan-200 to-amber-100",
  },
  {
    id: "wine",
    title: "Sunset Wine Tasting",
    desc: "Guided tour through terraced vineyards overlooking the sea. Sample local varieties and artisanal cheeses.",
    price: "$$$",
    duration: "2 hours",
    location: "Ravello",
    contributor: "Mike R.",
    votes: 5,
    gradient: "from-rose-300 via-orange-200 to-yellow-100",
  },
  {
    id: "cooking",
    title: "Cooking Class",
    desc: "Hands-on pasta making with a local nonna, followed by lunch on a lemon-grove terrace.",
    price: "$$",
    duration: "3 hours",
    location: "Amalfi",
    contributor: "Josh T.",
    votes: 2,
    gradient: "from-lime-200 via-emerald-100 to-teal-100",
  },
  {
    id: "hike",
    title: "Path of the Gods Hike",
    desc: "The coast's most famous clifftop trail, with panoramic views the whole way.",
    price: "$",
    duration: "5 hours",
    location: "Bomerano",
    contributor: "Sarah J.",
    votes: 4,
    gradient: "from-indigo-200 via-sky-200 to-emerald-100",
  },
];

export default function ActivitiesPage() {
  const [index, setIndex] = useState(0);
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const current = activities[index];
  const done = index >= activities.length;

  function vote(value: boolean) {
    // Optimistic update per DESIGN.md §4 — no spinner, auto-advance.
    setMyVotes((v) => ({ ...v, [current.id]: value }));
    setIndex((i) => i + 1);
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="w-full sticky top-0 z-40 bg-bg flex justify-between items-center px-edge py-md">
        <h1 className="text-2xl font-bold text-accent tracking-tight">Packd</h1>
        <div className="w-10 h-10 rounded-full bg-accent-tint border border-border flex items-center justify-center font-bold text-accent">
          S
        </div>
      </header>

      <main className="max-w-md mx-auto px-edge pt-lg pb-32 min-h-[calc(100vh-160px)] flex flex-col justify-center">
        {done ? (
          <div className="bg-surface rounded-card shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-xl text-center">
            <div className="text-5xl mb-md">🎉</div>
            <h2 className="text-xl font-bold text-ink mb-sm">
              All voted — nice work.
            </h2>
            <p className="text-ink-secondary">
              You said yes to{" "}
              {Object.values(myVotes).filter(Boolean).length} of{" "}
              {activities.length} activities. Results update as the rest of the
              group votes.
            </p>
          </div>
        ) : (
          <div className="relative w-full aspect-[3/4] sm:aspect-[4/5]">
            <div className="relative w-full h-full bg-surface rounded-card shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
              <div className="relative h-[60%] w-full overflow-hidden">
                <div
                  className={`w-full h-full bg-gradient-to-br ${current.gradient}`}
                />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/20 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/30 backdrop-blur-md rounded-full px-3 py-1 text-ink border border-white/30">
                  <span className="text-[13px]">
                    Added by {current.contributor}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 bg-accent/90 text-white text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {current.votes} people said yes
                </div>
              </div>

              <div className="flex-1 p-md flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-xl font-bold text-ink">
                      {current.title}
                    </h2>
                    <span className="text-accent font-medium">
                      {current.price}
                    </span>
                  </div>
                  <p className="text-ink-secondary text-sm line-clamp-2">
                    {current.desc}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-[13px] text-ink-secondary">
                    <span>{current.duration}</span>
                    <span>·</span>
                    <span>{current.location}</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-border mt-2">
                  <button
                    onClick={() => vote(false)}
                    aria-label="Vote no"
                    className="flex-1 h-14 bg-bg flex items-center justify-center rounded-xl active:scale-95 transition-transform hover:bg-border/50 text-ink-secondary"
                  >
                    <XIcon width={26} height={26} />
                  </button>
                  <button
                    onClick={() => vote(true)}
                    aria-label="Vote yes"
                    className="flex-[2] h-14 bg-accent flex items-center justify-center gap-2 rounded-xl text-white shadow-lg active:scale-95 transition-transform hover:bg-accent-dark font-semibold"
                  >
                    <CheckIcon width={24} height={24} />
                    Yes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!done && (
          <div className="flex justify-center gap-2 mt-xl">
            {activities.map((a, i) => (
              <div
                key={a.id}
                className={
                  i === index
                    ? "w-8 h-1.5 rounded-full bg-accent"
                    : "w-1.5 h-1.5 rounded-full bg-border"
                }
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
