const { expect, test } = require("@playwright/test");

test("first simulation recalculates, validates, and saves", async ({ page }) => {
  await page.goto("/app.html");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ce bien vaut-il vraiment le coup");
  await page.locator('[data-field="monthlyRent"]').fill("900");
  await expect(page.locator("#stripCashflow")).not.toHaveText("-");
  await expect(page.locator("#dirtyIndicator")).toBeVisible();

  await page.locator("#projectName").fill("Projet E2E");
  await page.locator("#saveProjectButton").click();
  await expect(page.locator("#projectList")).toContainText("Projet E2E");
  await expect(page.locator("#dirtyIndicator")).toBeHidden();

  await page.locator('[data-field="purchasePrice"]').fill("0");
  await expect(page.locator('[data-field="purchasePrice"]')).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#validationPanel")).toBeVisible();
});

test("saved projects can be compared, sorted, and assigned a baseline", async ({ page }) => {
  await page.goto("/app.html");
  await page.locator("#projectName").fill("Projet prudent");
  await page.locator("#saveProjectButton").click();
  await page.locator("#newProjectButton").click();
  await page.locator("#projectName").fill("Projet rentable");
  await page.locator('[data-field="monthlyRent"]').fill("1100");
  await page.locator("#saveProjectButton").click();

  await expect(page.locator("#projectComparison")).toBeVisible();
  await expect(page.locator("#comparisonRows tr")).toHaveCount(2);
  await expect(page.locator("#comparisonRows")).toContainText("Crédit · Meublé · LMNP réel");
  await page.locator("#comparisonSort").selectOption("cashflow");
  await expect(page.locator("#comparisonRows tr").first()).toContainText("Projet rentable");
  await page.getByRole("radio", { name: /Projet prudent/ }).check();
  await expect(page.locator("#comparisonNote")).toContainText("Projet prudent");
});

test("a saved project survives a real browser reload", async ({ page }) => {
  await page.goto("/app.html");
  await page.locator("#projectName").fill("Projet persistant");
  await page.locator('[data-field="monthlyRent"]').fill("875");
  await page.locator("#saveProjectButton").click();
  await page.reload();

  await expect(page.locator("#projectList")).toContainText("Projet persistant");
  await page.getByRole("button", { name: /Projet persistant/ }).click();
  await expect(page.locator('[data-field="monthlyRent"]')).toHaveValue("875");
});

test("projects export, import, and delete in bulk without a server", async ({ page }) => {
  await page.goto("/app.html");
  await page.locator("#projectName").fill("Projet portable");
  await page.locator("#saveProjectButton").click();
  await page.getByText("Sauvegarde et transfert", { exact: true }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportProjectsButton").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^rentaloc-simulations-\d{4}-\d{2}-\d{2}\.json$/);
  const exportPath = await download.path();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-project-action="delete"]').click();
  await expect(page.locator("#projectList")).toContainText("Aucune simulation");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#importProjectsInput").setInputFiles(exportPath);
  await expect(page.locator("#projectList")).toContainText("Projet portable");

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#deleteAllProjectsButton").click();
  await expect(page.locator("#projectList")).toContainText("Aucune simulation");
});

test("native dialogs restore focus and clipboard actions report their outcome", async ({ page }) => {
  await page.goto("/app.html");
  await page.locator("#helpButton").click();
  await expect(page.locator("#helpOverlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpButton")).toBeFocused();

  await page.locator("#copyButton").click();
  await expect(page.locator("#copyStatus")).toContainText(/Résumé copié|Copie indisponible/);
});

test("the 50-project limit refuses a new save without evicting existing projects", async ({ page }) => {
  await page.goto("/app.html");
  await page.evaluate(() => {
    const projects = Array.from({ length: 50 }, (_, index) => ({
      id: `seed-${index}`,
      name: `Projet ${index + 1}`,
      values: { ...globalThis.RentaLocSchema.defaults },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    }));
    globalThis.localStorage.setItem(
      "rentaloc-projects-v1",
      JSON.stringify({
        version: 2,
        simulationSchemaVersion: 2,
        savedAt: "2026-01-02T00:00:00.000Z",
        projects,
      }),
    );
  });
  await page.reload();

  await page.locator("#projectName").fill("Projet 51");
  await page.locator("#saveProjectButton").click();

  await expect(page.locator("#projectStatus")).toContainText("limite de 50");
  await expect(page.locator("#projectList .project-item")).toHaveCount(50);
  const saved = await page.evaluate(() => JSON.parse(globalThis.localStorage.getItem("rentaloc-projects-v1")));
  expect(saved.projects).toHaveLength(50);
  expect(saved.projects.at(-1).id).toBe("seed-49");
});

test("mobile flow reflows and preserves contextual keyboard controls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/app.html");
  const overflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.locator('[data-field="financingMethod"]').selectOption("cash");
  await expect(page.locator('[data-field="interestRate"]')).toBeHidden();
  await page.getByText("Sensibilité", { exact: true }).click();
  await expect(page.locator("#sensitivityRows")).toBeVisible();
  await expect(page.locator("#networkStatus")).toContainText("En ligne");
});

test("install affordance is available where native prompting is absent", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#installButton")).toBeVisible();
  await page.locator("#installButton").click();
  await expect(page.locator("#installOverlay")).toBeVisible();
  await expect(page.locator("#installInstructions")).toContainText(/Installer|Ajouter|menu/);
});

test("offline reload serves both landing and simulator shells", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Deterministic service-worker lifecycle coverage runs in Chromium.");
  await page.goto("/");
  await page.evaluate(() => globalThis.navigator.serviceWorker.ready);
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Voyez ce que l'annonce ne vous dit pas");
    await page.goto("/app.html", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ce bien vaut-il vraiment le coup");
  } finally {
    await context.setOffline(false);
  }
});

test("a real waiting service worker activates only through the update control", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Deterministic service-worker lifecycle coverage runs in Chromium.");
  await page.goto("/app.html");
  await page.evaluate(async () => {
    await globalThis.navigator.serviceWorker.ready;
    if (!globalThis.navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        globalThis.navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
      );
    }
  });
  await page.reload();

  await page.evaluate(async () => {
    await globalThis.navigator.serviceWorker.register("./sw.js?e2e-update=1", {
      scope: "./",
      updateViaCache: "none",
    });
  });
  await expect(page.locator("#updateButton")).toBeVisible({ timeout: 10_000 });
  const previousScript = await page.evaluate(() => globalThis.navigator.serviceWorker.controller.scriptURL);
  const reloaded = page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await page.locator("#updateButton").click();
  await reloaded;
  const currentScript = await page.evaluate(() => globalThis.navigator.serviceWorker.controller.scriptURL);
  expect(previousScript).not.toContain("e2e-update=1");
  expect(currentScript).toContain("e2e-update=1");
});
