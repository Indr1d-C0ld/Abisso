# Fonti della Fase 2: lamiera, ordinate, petali

Ricerca del 24/11/2026. Stesse convenzioni di `FONTI-RISPOSTA.md`.

## Deformazione permanente (`src/sim/plate.ts`)

- **Yuen, Nurick, Langdon et al. (2017)**, *Deformation of thin plates subjected to
  impulsive load: Part III – an update 25 years on*, Int. J. Impact Eng. 107, 108–117.
  https://eprints.whiterose.ac.uk/159056/1/Yuen%20IJIE%20v%20plates%202017.pdf — verificato.
  - Piastra quadrangolare incastrata: φq = I / (2 H² √(B L ρ σ)), I impulso **totale** (N·s).
  - Fit aggiornato: δ/H = 0,506 φq − 0,158 (356 prove, R² = 0,94); fit 1989:
    δ/H = 0,471 φq + 0,001. Solo modo I (grande deformazione senza strappo), acciai dolci.
- **Lomazzi, Giglio & Manes (2021)**, IJIE, doi 10.1016/j.ijimpeng.2021.103890 — conferma
  la forma con impulso specifico × B × L e il segno −0,158.
- **Cloete (2022)**, tesi Univ. of Cape Town — forma circolare φc = I / (π R H² √(ρσ))
  (con R, non R²); soglie di strappo solo per le sue piastre (modo II ≈ φ 17–18).
- Le fit usano lo snervamento quasi-statico, senza fattore dinamico.
- **Limiti dichiarati nell'app**: prove su piastre di 1–4 mm e 0,1–0,3 m; nessuna fit
  specifica per esplosioni subacquee trovata; impulso di Cole libero, non corretto per
  l'interazione fluido–struttura (Taylor); nessun precarico idrostatico.
- Non trovato: soglie generali di strappo per piastre incastrate (Nurick & Shave 1996).

## Struttura degli U-Boot

| Classe | Ordinate | Lamiera del Druckkörper | Fonte |
|---|---|---|---|
| VIIC | bulbo 197 mm, passo 23½ in ≈ 600 mm, 82 ordinate | ⅞ in ≈ 22 mm a centro scafo (ONI); 22,4 mm a centro, 16 mm alle estremità (britannico) | ONI 28/9/1941 e C.B. 4318 (1943), U-570, uboatarchive.net |
| IXC/40 | bulbo 200 × 11 mm, passo 700 mm | 18 mm (16 alle estremità), Ø 4 400 mm; acciaio "52": snervamento 51 300 psi | Portsmouth 1946, 2G-9C S11 |
| XB | circa 800 mm, 88 ordinate | 20,5 mm (17 alle estremità) | Navy Instruction 371/184 |
| XXI | bulbo esterno 240 × 11, passo 800 mm (400 alle estremità) | fino a 26 mm in alto, 18 mm nel lobo inferiore | Portsmouth 1946, 2G-21 S11 |
| IIB | non trovato (stima 500 mm) | non trovato | — |

## Spessori corretti con le misure di guerra (25/11/2026)

Il catalogo (Rössler e Stern via sintesi secondarie) usava 18,5 mm per VIIC, IX e XB,
21 mm per il VIIC/41 e 23 mm per il XXI. Ora:

| Classe | Prima | Ora | Stato |
|---|---|---|---|
| VIIC, VIIB | 18,5 | 22 | verificato (U-570); VIIB assunto uguale |
| VIIC/41 | 21 | 24,5 | ricostruito: +2,5 mm delle sintesi applicati ai 22 misurati |
| IXB, IXC, IXC/40 | 18,5 | 18 | verificato per il IXC/40 (Portsmouth 1946), assunto per gli altri |
| XB | 18,5 | 20,5 | verificato (Navy Instruction 371/184) |
| XXI | 23 | 26 | verificato per il lobo superiore (Portsmouth 1946); il lobo inferiore ha 18 mm |
| IIB | 15,5 | 15,5 | non trovato |

Il riferimento della scala di scafo (`hullScale`, `src/sim/model.ts`) passa da 18,5/4,7 a
22/4,7: la stima RN di calibrazione ("fende 22 mm a 20 ft") parla del VIIC con 22 mm, e
così l'esito del VIIC resta identico. Le altre classi si spostano rispetto al VIIC.

Effetto su 9 607 combinazioni (5 battelli, tutte le armi e gli schemi, 3 quote, 4 scarti
di scoppio, 5 mancate): 491 esiti cambiati (IXC 169, IIB 161, XXI 93, XB 66), quasi tutti
tutti verso il peggio; VIIC invariato. Il motivo: il VIIC sale di 3,5 mm (+19%), le altre
classi meno o per niente, quindi rispetto al riferimento diventano più deboli. Il IIB, senza
misura, peggiora solo per lo spostamento del riferimento. Casi storici: U-110
(9/5/1941) e U-505 (4/6/1944), entrambi catturati, passavano da "serio" a "perdita". Lo
scarto laterale, già un'ipotesi dichiarata, è stato portato da 12 a 14 m (U-110) e da 14
a 16 m (U-505): tornano "serio", con falle in ogni compartimento. Il ritocco è scritto
nelle ipotesi di ciascun caso.

Aperto: il diametro del Druckkörper del IX nel modello è 4,90 m (inviluppo), il rapporto
di Portsmouth dà 4,40 m per il IXC/40. Non cambiato: tocca anche la geometria 3D.

## Petali

- **Nam et al. (2015)**, rassegna, ASEAN Eng. J. 5(2), che riporta Wierzbicki (1999) e
  Lee & Wierzbicki (2005): minimo di energia a semiangolo ≈ 50°, cioè circa 4 petali;
  minimo debole, 5–6 frequenti. Originali non aperti (confidenza media).
- **Kazemahvazi, Radford, Deshpande & Fleck (2007)**, J. Mech. Mater. Struct. 2(10):
  quattro petali su piastre colpite da onda d'urto in acqua.
- Resa, non fonte: lunghezza e arricciatura dei petali.
