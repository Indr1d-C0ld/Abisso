// Fotografa lo Studio con alcuni preset, da vicino. Uso:
// node scripts/studio-shots.mjs [url] [preset...]   (preset = testo del pulsante)
// Opzioni via env: FINISH=Atlantico, ZOOM=n (scatti di rotella), CAM=Traverso,
// FOCUS=fx,fy (doppio clic in quel punto della vista, frazioni 0–1), SUFFIX=testo,
// ZOOMAT=fx,fy (punto verso cui zoomare), INPUT='{"axisDepth":26,...}' (caso caricato prima dell'avvio). Preset "-" = nessun clic.
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
if (process.env.INPUT) {
  await p.addInitScript((json) => localStorage.setItem("abisso.input.v1", json), process.env.INPUT);
}
const errs = [];
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 240)));
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(url);
await p.waitForTimeout(4000);
const click = (name) => p.getByRole("button", { name, exact: true }).first().click();
if (process.env.FINISH) await click(process.env.FINISH);
if (process.env.CAM) await click(process.env.CAM);
for (const preset of presets) {
  if (preset !== "-") await click(preset);
  await p.waitForTimeout(6000);
  const box = await p.locator(".viewport canvas").boundingBox();
  if (process.env.ZOOM && box) {
    const [zx, zy] = (process.env.ZOOMAT ?? "0.5,0.5").split(",").map(Number);
    await p.mouse.move(box.x + box.width * zx, box.y + box.height * zy);
    for (let i = 0; i < Number(process.env.ZOOM); i++) {
      await p.mouse.wheel(0, -250);
      await p.waitForTimeout(80);
    }
    await p.waitForTimeout(1500);
  }
  if (process.env.FOCUS && box) {
    const [fx, fy] = process.env.FOCUS.split(",").map(Number);
    await p.mouse.dblclick(box.x + box.width * fx, box.y + box.height * fy);
    await p.waitForTimeout(2500);
  }
  const tag = `${process.env.FINISH ?? "controllo"}-${preset}${process.env.SUFFIX ? "-" + process.env.SUFFIX : ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await p.locator(".viewport").screenshot({ path: `test-results/studio-${tag}.png` });
}
console.log(JSON.stringify(errs));
await b.close();
