export function DoorMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0f4c5c" />
      <path d="M10 26V7.5L21 5v21" fill="none" stroke="#fbf7f0" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M21 5h2.5v21" fill="none" stroke="#fbf7f0" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="18" cy="16.5" r="1.6" fill="#e9a23b" />
      <path d="M6 26h20" stroke="#e9a23b" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <DoorMark />
      <span className="font-display text-xl font-semibold tracking-tight text-teal-900">OneDoor</span>
    </span>
  );
}
