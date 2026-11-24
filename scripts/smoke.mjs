// Smoke test visivo: apre l'app in Chromium headless (WebGL software), scatta alcune
// viste e fallisce se la pagina registra errori in console.
// Uso: node scripts/smoke.mjs [url] [cartella-output]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.argv[2] ?? "http://localhost:8080/";
const out = process.argv[3] ?? "test-results";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errors = [];
const shoot = async (name, viewport, steps = []) => {
  const page = await browser.newPage({ viewport });
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text().slice(0, 240)}`));
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(5000);
  for (const label of steps) {
    await page.getByRole("button", { name: label, exact: true }).first().click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.close();
};

await shoot("studio", { width: 1440, height: 900 });
await shoot("interni", { width: 1440, height: 900 }, ["Struttura interna"]);
await shoot("archivio", { width: 1440, height: 900 }, ["Archivio"]);
await shoot("casi", { width: 1440, height: 900 }, ["Casi"]);
await shoot("mobile", { width: 390, height: 844 });
await browser.close();

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: nessun errore in console. Screenshot in ${out}/`);
