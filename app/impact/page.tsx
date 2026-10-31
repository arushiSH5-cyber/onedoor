import type { Metadata } from "next";
import { ImpactLedger } from "@/components/impact/ImpactLedger";

export const metadata: Metadata = { title: "Ratepayer ledger — OneDoor" };

export default function ImpactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <p className="eyebrow">Deliverable: cost-benefit model · Impact &amp; Sustainability</p>
      <h1 className="h1">The ratepayer ledger</h1>
      <p className="mt-2 mb-6 max-w-3xl text-muted">
        Discounts are funded by other ratepayers. This model puts the cost next to what it saves — fewer arrears written off, fewer shutoffs, less
        collections work — so regulators can see the trade-off. Move any slider; every number shows its source.
      </p>
      <ImpactLedger />
    </div>
  );
}
