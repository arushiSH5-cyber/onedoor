import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { anonymize, sanitizeInput } from "@/lib/screener/anonymize";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  let record;
  try {
    record = anonymize(sanitizeInput(body.input), body);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const id = typeof body.id === "string" ? body.id : null;
    const existing = id ? await prisma.screening.findUnique({ where: { id } }) : null;
    // Keep the first completion time when a result is refined (e.g. the income follow-up).
    const row = existing
      ? await prisma.screening.update({ where: { id: existing.id }, data: { ...record, completionSecs: existing.completionSecs || record.completionSecs } })
      : await prisma.screening.create({ data: record });
    return NextResponse.json({ id: row.id, stored: true, record });
  } catch (e) {
    console.warn("[screenings] database unavailable:", (e as Error).message);
    return NextResponse.json({ id: null, stored: false, record });
  }
}
