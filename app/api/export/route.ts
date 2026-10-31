import { loadRows, toCsv } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

/** Anonymized CSV export. Optional DASHBOARD_TOKEN env var protects it (?token=...). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = process.env.DASHBOARD_TOKEN;
  if (token && url.searchParams.get("token") !== token) return new Response("Forbidden", { status: 403 });
  const { rows } = await loadRows(url.searchParams.get("seed") !== "0");
  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="onedoor-screenings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
