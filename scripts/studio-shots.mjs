// Fotografa lo Studio con alcuni preset, da vicino. Uso:
// node scripts/studio-shots.mjs [url] [preset...]   (preset = testo del pulsante)
// Opzioni via env: FINISH=Atlantico, ZOOM=n (scatti di rotella), CAM=Traverso.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const args = process.argv.slice(2);
const url = args[0]?.startsWith("http") ? args.shift() : "http://127.0.0.1:8080/";
const presets = args.length ? args : ["14 m al traverso"];
mkdirSync("test-results", { recursive: true });
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 240)));
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(url);
await p.waitForTimeout(4000);
const click = (name) => p.getByRole("button", { name, exact: true }).first().click();
if (process.env.FINISH) await click(process.env.FINISH);
if (process.env.CAM) await click(process.env.CAM);
for (const preset of presets) {
  await click(preset);
  await p.waitForTimeout(6000);
  const box = await p.locator(".viewport canvas").boundingBox();
  if (process.env.ZOOM && box) {
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < Number(process.env.ZOOM); i++) {
      await p.mouse.wheel(0, -250);
      await p.waitForTimeout(80);
    }
    await p.waitForTimeout(1500);
  }
  const tag = `${process.env.FINISH ?? "controllo"}-${preset}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await p.locator(".viewport").screenshot({ path: `test-results/studio-${tag}.png` });
}
console.log(JSON.stringify(errs));
await b.close();
