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

## Discrepanza aperta: spessori del catalogo

Il catalogo dell'app (da Rössler e Stern, via sintesi secondarie) usa 18,5 mm per il VIIC,
21 mm per il VIIC/41 e 23 mm per il XXI. Le misure di guerra sull'U-570 danno circa 22 mm
a centro scafo; il rapporto USA sul XXI dà 26/18 mm. Lo spessore entra nella scala di
scafo del modello di danno: correggerlo cambia gli esiti. **Non cambiato**: da decidere.
Nota: la stima RN usata per calibrare il modello ("fende 22 mm a 20 ft") parla proprio
di 22 mm.

## Petali

- **Nam et al. (2015)**, rassegna, ASEAN Eng. J. 5(2), che riporta Wierzbicki (1999) e
  Lee & Wierzbicki (2005): minimo di energia a semiangolo ≈ 50°, cioè circa 4 petali;
  minimo debole, 5–6 frequenti. Originali non aperti (confidenza media).
- **Kazemahvazi, Radford, Deshpande & Fleck (2007)**, J. Mech. Mater. Struct. 2(10):
  quattro petali su piastre colpite da onda d'urto in acqua.
- Resa, non fonte: lunghezza e arricciatura dei petali.
