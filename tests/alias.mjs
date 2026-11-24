// Risolve l'alias "@/..." (come in vite.config.ts) per i test eseguiti con Node puro.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = fileURLToPath(new URL("../src/", import.meta.url));

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const base = src + specifier.slice(2);
      for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
        if (existsSync(cand) && !cand.endsWith("/")) return next(pathToFileURL(cand).href, context);
      }
    }
    return next(specifier, context);
  },
});
