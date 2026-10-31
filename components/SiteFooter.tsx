import Link from "next/link";
import { DoorMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <DoorMark className="h-7 w-7 shrink-0" />
          <p>
            OneDoor is a hackathon prototype (Global Energy Hackathon 2026, Brief 11). It is not affiliated with Con Edison, NY DPS, or any
            agency. Results are estimates; the utility makes the final decision.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink">Get help now</p>
          <p>EAP: EAP@conEd.com · Enhanced EAP: 1-877-400-2501</p>
          <p>HEAP and One-Shot Deal: call 311</p>
        </div>
        <div className="flex flex-col gap-1">
          <Link href="/methods" className="hover:underline">Data &amp; sources</Link>
          <Link href="/policy" className="hover:underline">Enrollment design &amp; legal pathway</Link>
          <Link href="/dashboard" className="hover:underline">Live screening data</Link>
        </div>
      </div>
    </footer>
  );
}
