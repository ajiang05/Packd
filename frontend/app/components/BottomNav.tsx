"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuggageIcon,
  CompassIcon,
  ChecklistIcon,
  WalletIcon,
} from "./icons";

// Demo trip id until real trips are wired to the database.
const DEMO_TRIP = "demo";

const items = [
  { href: "/trips", label: "Trips", icon: LuggageIcon },
  {
    href: `/trips/${DEMO_TRIP}/activities`,
    label: "Activities",
    icon: CompassIcon,
  },
  {
    href: `/trips/${DEMO_TRIP}/checklist`,
    label: "Checklist",
    icon: ChecklistIcon,
  },
  { href: `/trips/${DEMO_TRIP}/budget`, label: "Budget", icon: WalletIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-surface rounded-t-card shadow-[0_-4px_16px_rgba(0,0,0,0.06)] border-t border-border">
      {items.map(({ href, label, icon: IconComponent }) => {
        const active =
          href === "/trips" ? pathname === "/trips" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform duration-200 ${
              active ? "text-accent font-bold" : "text-ink-secondary hover:text-accent/80"
            }`}
          >
            <IconComponent width={22} height={22} />
            <span className="text-[11px] uppercase tracking-wide">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
