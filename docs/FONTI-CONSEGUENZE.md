# Fonti della Fase 4: acqua, assetto, quota, cloro, nafta, implosione

Ricerca del 25/11/2026. Stesse convenzioni di `FONTI-RISPOSTA.md`: "verificato" = letto
nella fonte; "ricostruito" = algebra o combinazione; "non trovato" = dichiarato.
Codice: `src/sim/hydrostatics.ts`, resa in `src/render/effects/Flooding.tsx` e
`Consequences.tsx`. Il verdetto resta l'indice del modello di danno.

## Assetto in immersione

- **USNA, EN400 Principles of Ship Performance, Course Notes (2020)**, cap. 10,
  pp. 10-12 e 10-14 — verificato: in immersione BM = 0, GM = BG; per uno spostamento di
  peso Δ·BG·tan φ = w·t, valido per ogni angolo (B fisso nello scafo).
- **Ricostruito**: peso aggiunto sotto B raddrizza (Δ BG + Σ w z); l'acqua libera scorre
  verso la paratia bassa di i_L / v · tan θ, limitato a un terzo del locale; equilibrio
  per punto fisso, limitato a 75°.
- **Non trovato**: BG di un U-Boot. Si usa 0,3 m (0,25 IIB, 0,35 XXI), stima di studio
  coerente con i GM in superficie dei sommergibili USA (BuShips War Damage Report 58:
  1,25–1,63 ft) e con l'esempio didattico USNA (1,5 ft).
- In superficie: BM_L ≈ I_wp / V con piano d'acqua 0,7 L B (ricostruito).

## Aria e zavorre

- **M.Dv. 371,181, Vorläufige U-Boots-Angaben Typ VIIC (1940)**, §III.4.c p. 43 e
  §A.2.c p. 6 (uboatarchive.net) — verificato: 12 bombole da 325 l (3,9 m³) a 205 at;
  casse di zavorra 103,6 m³.
- **U-570, KTB Notes – Diving e British Report** (uboatarchive.net) — verificato:
  883 / 784 t, riserva 99 t (144 t con le casse 2 e 4 a zavorra).
- **Ricostruito**: acqua espellibile a quota d ≈ 3,9 · 205 / (1 + d/10) m³.
- Altre classi: aria scalata con il dislocamento (stima). Ritardo di 25 s e rateo di
  2 t/s per la soffiatura: ipotesi di resa. Il riempimento dei locali non si ricalcola
  con la discesa; pompe di sentina e timoni non sono modellati.

## Velocità di caduta

- **Jones, Cincotta & Walker, NASA TR 1969**, fig. 10 — verificato: cilindro a
  Re 10⁶–10⁷, Cd ≈ 0,52–0,54. Di punta: 0,3, stima.
- **Ricostruito**: v = √(2 (W − B) / (ρ Cd A)), massa virtuale 2 Δ (come Fase 3b).
- **Rule (2018)**, *Why the USS Scorpion Was Lost* — verificato: lo Scorpion scese a una
  media di 0,36 m/s per quasi 22 minuti prima dell'implosione (peso netto piccolo); con
  due o tre locali aperti il modello dà 3–5 m/s.

## Cloro

- **Non trovato**: tassi di produzione (il rapporto USN sull'S-21 dice che non sono noti;
  DTIC AD1159379, letto solo come estratto). L'intensità a schermo è resa.
- **ONI, interrogatorio dei superstiti di U-604 e U-185** — verificato: sull'U-185 il gas
  si formò in fretta e i Diesel lo aspirarono. **ONI su U-570** — verificato: circa 40 vasi
  incrinati, nessun cloro.
- **NIOSH** — verificato: IDLH 10 ppm.

## Nafta

- **U-570 British Report** — verificato: peso specifico 0,842.
- **Nordam, Skancke, Duran & Barker (2020)**, arXiv:2010.11890, §4.1 — verificato: legge
  di Johansen fra Stokes e Cd = 0,44. Gocce di 1 / 2 / 5 mm: 3,6 / 7,6 / 15 cm/s.
  Il diametro di 2 mm è un'ipotesi.
- Rapporti ASW su uboatarchive.net (letti come estratti): chiazze da 200 × 100 m a quasi
  un chilometro; da sole non bastavano come prova.

## Implosione

- **Rule (2018)**, pp. 3 e 5 — verificato: Scorpion, collasso a 466 m (2,2 volte la quota di
  collaudo), compressione in 37 ms, pulsazione della bolla 0,224 s (4,46 Hz).
- **M.Dv. 371,181** — verificato: VIIC, quota di costruzione 100 m. **Non trovato in
  fonte primaria**: i 250 m di collasso del modello.
- Forma del cedimento (ovalizzazione, sette campate): resa.
