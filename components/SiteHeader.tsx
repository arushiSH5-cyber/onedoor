"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { LangPicker } from "./LangPicker";
import { useLang } from "./LangProvider";

const NAV = [
  { href: "/check", key: "nav.check" },
  { href: "/sms", key: "nav.sms" },
  { href: "/map", key: "nav.map" },
  { href: "/impact", key: "nav.impact" },
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/policy", key: "nav.policy" },
  { href: "/methods", key: "nav.methods" },
];

export function SiteHeader() {
  const { t } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="OneDoor home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-teal-50 ${
                pathname === n.href ? "bg-teal-50 text-teal-900" : "text-muted"
              }`}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangPicker />
          <button
            className="rounded-lg border border-line p-2 xl:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line px-4 pb-3 xl:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-medium hover:bg-teal-50">
              {t(n.key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
