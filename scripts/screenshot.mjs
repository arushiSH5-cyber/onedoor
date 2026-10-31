// Captures app screenshots for the pitch deck: node scripts/screenshot.mjs [baseUrl]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.goto(`${base}/check?demo=rosa`);
await page.getByTestId("household-link").waitFor();
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.evaluate(() => window.scrollTo(0, 120));
await page.screenshot({ path: "deliverables/screenshot-rosa-result.png" });
await page.goto(`${base}/map`);
await page.waitForSelector(".leaflet-interactive");
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.evaluate(() => window.scrollTo(0, 330));
await page.screenshot({ path: "deliverables/screenshot-gap-map.png" });
await browser.close();
console.log("saved deliverables/screenshot-*.png");
