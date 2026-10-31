import type { Metadata } from "next";
import { Screener } from "@/components/screener/Screener";

export const metadata: Metadata = { title: "Check my household — OneDoor" };

export default function CheckPage() {
  return <Screener />;
}
