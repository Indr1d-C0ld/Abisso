// Fotografa i modelli della galleria (Archivio → Modelli 3D) con Chromium headless.
// Uso: node scripts/gallery-shots.mjs [url] [voce...]   es. boat:vii-c charge:hedgehog
// Senza voci fotografa tutto. Le immagini vanno in test-results/gal-*.png.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const args = process.argv.slice(2);
const url = args[0]?.startsWith("http") ? args.shift() : "http://127.0.0.1:8080/";
mkdirSync("test-results", { recursive: true });
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
const errs=[]; p.on("console", m => m.type()==="error" && errs.push(m.text().slice(0,200))); p.on("pageerror", e=>errs.push(e.message));
await p.goto(url); await p.waitForTimeout(3000);
await p.getByRole("button", { name: "Archivio", exact: true }).click(); await p.waitForTimeout(800);
const sel = p.locator(".gallery select");
const all = await sel.locator("option").evaluateAll((os) => os.map((o) => o.value));
for (const v of args.length ? args : all) {
  await sel.selectOption(v); await p.waitForTimeout(7000);
  await p.locator(".gallery-view").screenshot({ path: `test-results/gal-${v.replace(":","-")}.png` });
}
console.log(JSON.stringify(errs)); await b.close();
