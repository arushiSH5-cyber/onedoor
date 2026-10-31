import { expect, test, type Page } from "@playwright/test";

/** Walks Rosa's household through the step-by-step form (not the demo button). */
async function rosaFlow(page: Page, t: Record<string, RegExp>) {
  await page.getByRole("radio", { name: t.bronx }).check();
  await page.getByTestId("next").click();

  await page.getByRole("radio", { name: t.billMine }).check();
  await page.getByRole("radio", { name: t.heatIncluded }).first().check();
  await page.getByTestId("next").click();

  // Add Rosa's mother, 60+.
  await page.getByTestId("add-member").click();
  const mother = page.getByTestId("member-1");
  await mother.locator("select").first().selectOption("parent");
  await mother.locator("select").nth(1).selectOption("60plus");
  await page.getByTestId("next").click();

  // Mother receives SSI; Rosa receives nothing.
  await page.getByTestId("benefits-1").getByRole("checkbox", { name: /SSI/ }).check();
  await page.getByTestId("next").click();

  // Income: exact amount.
  await page.getByRole("button", { name: t.typeAmount }).click();
  await page.getByRole("textbox").last().fill("52000");
  await page.getByTestId("next").click();
}

test("Rosa in English: EAP via Household Link, consent code", async ({ page }) => {
  await page.goto("/check?lang=en");
  await rosaFlow(page, { bronx: /^Bronx$/, billMine: /^Mine$/, heatIncluded: /Heat is included in rent/, typeAmount: /Type an amount/ });

  await expect(page.getByTestId("pathway-title")).toHaveText(/Energy Affordability Program \(EAP\)/);
  await expect(page.getByTestId("household-link")).toBeVisible();
  await expect(page.getByTestId("enrollment-badge")).toHaveText(/need to apply/);
  await expect(page.getByTestId("discount")).toContainText("$33.47");

  await page.getByTestId("consent-checkbox").check();
  await expect(page.getByTestId("consent-ref")).toContainText(/OD-[A-Z0-9]{4}-[A-Z0-9]{4}/);
});

test("Rosa in Spanish via the language picker", async ({ page }) => {
  await page.goto("/check");
  await page.getByTestId("lang-picker").selectOption("es");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Revise su hogar");
  await rosaFlow(page, { bronx: /El Bronx/, billMine: /^A mi nombre$/, heatIncluded: /calefacción está incluida en la renta/, typeAmount: /Escribir una cantidad/ });

  await expect(page.getByTestId("pathway-title")).toHaveText(/Programa de Asequibilidad de Energía/);
  await expect(page.getByTestId("household-link")).toContainText("Vínculo del Hogar");
  await page.getByTestId("consent-checkbox").check();
  await expect(page.getByTestId("consent-ref")).toContainText("OD-");
});

test("every page loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const path of ["/", "/check", "/sms", "/map", "/impact", "/dashboard", "/policy", "/methods"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
