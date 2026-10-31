// Switch the Prisma datasource provider to match DATABASE_URL (sqlite locally, postgresql on Vercel/Neon).
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "";
const provider = /^postgres(ql)?:\/\//.test(url) ? "postgresql" : "sqlite";
const path = new URL("../prisma/schema.prisma", import.meta.url);
const schema = readFileSync(path, "utf8");
const next = schema.replace(/provider = "(sqlite|postgresql)"/, `provider = "${provider}"`);
if (next !== schema) writeFileSync(path, next);
console.log(`[prisma-provider] using ${provider}`);
