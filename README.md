# ABISSO

Studio analitico del danno da carica di profondità sugli U-Boot della seconda guerra
mondiale (Atlantico settentrionale, 1939–1945). Modello fisico da letteratura aperta,
scena 3D interattiva, archivio di casi storici con separazione netta fra documentato e
ipotizzato.

## Avvio

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # calibrazione del modello e coerenza del catalogo
npm run build      # typecheck + build statico in dist/
npm run smoke      # screenshot headless (richiede il dev server o un preview attivo)
```

Il build è un sito statico con base relativa: si può servire da qualunque cartella o
impacchettare come PWA/APK (Bubblewrap) senza modifiche. Font ospitati localmente
(Fontsource), nessuna risorsa esterna a runtime.

## Struttura

| Percorso | Contenuto |
|---|---|
| `src/sim/model.ts` | Modello di danno: picco di Cole, bolla (raggio e periodo di Willis), impulso, raggio di rottura scalato su carica, scafo e quota, allagamento a orifizio con aria intrappolata, onda d'urto |
| `src/sim/shape.ts` | Geometria parametrica degli scafi per famiglia (II, VII, IX, XB, XXI) |
| `src/data/` | Classi e battelli, ordigni, eventi storici, batterie, struttura interna, fonti |
| `src/state/store.ts` | Stato (zustand) con persistenza locale di input e casi |
| `src/components/abisso/` | Interfaccia: `App` (pannelli), `Scene` (React Three Fiber), schede di archivio e metodo |
| `tests/` | `node:test` con alias `@/` (vedi `tests/alias.mjs`) |
| `scripts/smoke.mjs` | Smoke test visivo con Chromium e WebGL software |
| `public/archive/` | Tavole e fotografie d'archivio |
| `docs/screenshots-grok/` | Riferimenti visivi della versione di partenza |
| `pre_assets/Abisso.zip` | Esportazione originale da Grok App Builder, conservata intatta |

## Origine

Base estratta dall'esportazione Grok App Builder in `pre_assets/`. Rimossi: router e
SSR TanStack Start/Nitro, deploy Vercel, autenticazione e database (inutilizzati),
multiplayer P2P, iniettore di branding Grok, skill e artefatti di build. Il codice di
dominio (`sim`, `data`, `state`, `components/abisso`) è invariato salvo:

- lo Studio resta montato quando si cambia scheda (prima lo smontaggio del Canvas
  generava errori `removeChild` dai portali `Html` di drei) e il render loop si ferma
  quando è nascosto;
- messaggio esplicito quando WebGL non è disponibile;
- percorsi delle immagini d'archivio relativi alla base;
- `selfcheck.ts` trasformato in test eseguibili.

## Note di metodo

Modello di studio, non strumento operativo. Le fonti principali (Rössler, Gröner,
Cole 1948, NavWeaps, uboat.net, rapporti US Navy) sono elencate in `src/data/boats.ts`
e nella scheda *Metodo* dell'app.
