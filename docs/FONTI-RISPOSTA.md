# Fonti della Fase 3b: bolla, getto, frusta, superficie

Ricerca del 24/11/2026. "Verificato" = formula letta nella fonte (testo, pagina renderizzata
o OCR controllato a vista). "Ricostruito" = algebra o confronto fra fonti. "Non trovato" =
dichiarato come tale nel codice e nell'interfaccia.

## Getto della bolla (`bubbleHull` in `src/sim/response.ts`)

- **Supponen, Obreschkow, Tinguely, Kobel, Dorsaz & Farhat (2016)**, *Scaling laws for jets
  of single cavitation bubbles*, J. Fluid Mech. 802, 263–293.
  https://arxiv.org/pdf/1703.01088 — verificato.
  - Anisotropia per parete rigida o superficie libera: ζ = 0,195 γ⁻², γ = d / Rmax.
  - Galleggiamento: ζ_g = ρ g R₀ / Δp; i contributi si sommano come vettori.
  - Velocità del getto U = 0,9 ζ⁻¹ √(Δp/ρ); spostamento al collasso Δz/R₀ = 2,5 ζ^0,6.
    Leggi ricavate per 10⁻⁴ < ζ < 0,1; il getto satura verso la velocità del suono.
  - Scala di laboratorio (bolle di millimetri), ma il comportamento dipende da ζ.
- **Subramanian, Yang, Romanò & Coutier-Delgosha (2024)**, *Bubble collapse near a wall.
  Part 1*, arXiv:2408.03479 — verificato. Regimi: γ ≲ 1,1 collasso toroidale sulla
  parete; 1,24–1,60 misto; ≥ 1,75 il getto non conta più per la pressione sulla parete.
- **Li, Wang, Zhang & Sagar (2023)**, arXiv:2306.14720 — esplosioni sotto superficie
  libera: γ < 0,75 la bolla sfonda la superficie; 0,75–2,1 getto verso il basso.
- A scala di carica di profondità il galleggiamento è rilevante (ζ_g ≈ Rmax/(d+10)).
- Non aperti: Blake & Gibson 1987; Klaseboer et al. 2005 (solo l'abstract).

## Cicli e risalita (`timeline.ts`, `response.ts`)

- **Riley (2010)**, *Analytical Solutions for Predicting Underwater Explosion Gas Bubble
  Behaviour*, DRDC Atlantic TM 2010-237, https://archive.org/details/DTIC_ADA547051 —
  verificato: costanti per ciclo (TNT, Swift & Decius) K = 2,11 / 1,57 / 1,33,
  J = 3,36 / 2,27 / 1,76; profilo di risalita z(t) = Δd (1 − cos(πt/2T))^0,40.
- **Brainard (2015)**, tesi Virginia Tech, https://vtechworks.lib.vt.edu/bitstream/handle/10919/64508/Brainard_BC_T_2016.pdf —
  verificato: risalita al primo minimo 12,2 √W / (d+10) m; fra primo e secondo minimo
  circa metà di questa.
- **Ricostruito**: Riley stampa la risalita come 12,4 W/(D+10), che darebbe 20 m per
  100 kg a 50 m. Si usa √W (12,3 come media), coerente con Brainard e con lo spostamento
  di Supponen (1,97 m contro 2,07 m nello stesso caso).
- **Discrepanza aperta**: il modello usa 3,38 per il raggio massimo; le fonti danno 3,36
  (Riley, cariche piccole) e 3,50 (Swisdak 1978 / Brainard, cariche grandi). Non
  cambiato per non spostare la calibrazione dei test; da decidere.
- Resa, non fonte: forma della curva nel ciclo (minimo 12%), risalita nel terzo ciclo.

## Frusta dello scafo (`hullFrequencyHz`, `whip.ts`)

- **Yin, Cui, Zhao & Hong (2014)**, *Predicting method of natural frequency for ship's
  overall vertical vibration*, Brodogradnja 65(3), https://hrcak.srce.hr/file/188445 —
  verificato: forma DNV/Kumai N = 1,61e6 √(I / (Δ_v L³)), uguale alla trave di Eulero
  libera–libera con E = 2,06e11 Pa (ricostruito).
- **Stettler (1995)**, tesi MIT, https://archive.org/details/DTIC_ADA298743 — verificato:
  sottomarino di 107 m, primo modo 1,984 Hz a secco e 1,370 Hz bagnato. Da qui la massa
  virtuale ≈ 2 × dislocamento (inferenza, dichiarata).
- **Vernon (1986)**, DREA TM 86/225, https://archive.org/details/DTIC_ADA178096 —
  verificato: caso peggiore con carica sotto la chiglia, a centro nave, frequenza della
  bolla uguale a quella del primo modo, più impulsi. Esempio: fregata a 1,68 Hz,
  167 kg a 24 m (il nostro periodo dà 0,614 s, cioè 1,63 Hz: coerente).
- **Non trovato**: dati di sezione di un U-Boot; un modello semplice dell'ampiezza.
  L'ampiezza è perciò una scala illustrativa dichiarata (×10 a schermo, smorzamento 5%
  ipotizzato). Non aperti: Keil 1961, Zong et al.

## Superficie (`surfaceEffect`, `SurfaceDome`)

- **Mellor (1986)**, *Blasting and blast effects in cold regions, Part II*, CRREL SR
  86-16, https://archive.org/download/DTIC_ADA178363/DTIC_ADA178363_djvu.txt —
  verificato: velocità della cupola u = 2 P_m cos θ / (ρ₀ U); tipi di eruzione per
  profondità / Rmax (da Young 1971): > 40 nessuno, 25–40 risalita, 7–25 mammelloni,
  4–7 mammelloni e pennacchi, 1–4 anello di pennacchi, 0,2–1 colonna, < 0,2 sfiato.
- **Ricostruito**: esponente del profilo radiale −1,07 (OCR illeggibile, dedotto).
- **Non trovato**: altezze dei pennacchi per cariche in acqua libera (le formule di
  Swisdak 1978 cap. 13 valgono per cariche sul fondo): nessun pennacchio disegnato.
