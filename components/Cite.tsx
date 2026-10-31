"use client";

import { useState } from "react";
import { REFS } from "@/lib/content/references";

/** Citation chip with a tooltip (hover, focus or tap) linking to the source. */
export function Cite({ n }: { n: number[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="rounded-md bg-teal-50 px-1.5 py-0.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => !e.currentTarget.parentElement?.contains(e.relatedTarget) && setOpen(false)}
      >
        [{n.join(", ")}]
      </button>
      {open && (
        <span role="tooltip" className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-line bg-paper p-3 text-left text-xs font-normal text-ink shadow-lg">
          {n.map((i) => (
            <a key={i} href={REFS[i].url} target="_blank" rel="noreferrer" className="block py-0.5 underline hover:text-teal-800">
              [{i}] {REFS[i].title}
            </a>
          ))}
          <span className="mt-1 block text-muted">Cited in GEH Brief 11.</span>
        </span>
      )}
    </span>
  );
}
