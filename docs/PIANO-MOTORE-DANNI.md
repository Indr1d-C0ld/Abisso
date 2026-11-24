# Piano: motore grafico del danno

Obiettivo: ogni cosa che si vede sullo scafo e in acqua deve **derivare da una grandezza
calcolata** dal modello (`src/sim/model.ts`), mostrata con la stessa onestà del rapporto
testuale: dove il modello è un'ipotesi, la grafica lo dichiara. Insieme: battelli resi
con i modelli Thrixel, nello Studio e non solo nell'Archivio.

## 1. Stato di partenza

| Cosa | Come funziona oggi | Limite |
|---|---|---|
| Scafo | Parametrico (`shape.ts`), 84 × 40 vertici, colori per vertice | Aspetto da schema; i modelli Thrixel stanno solo nella galleria |
| Danno sullo scafo | `stamp()` in `Scene.tsx`: tinta per gravità, ammaccatura radiale, triangoli tolti negli squarci, labbro esterno | Calcolato una volta, nessuna evoluzione; squarcio = buco tondo; ammaccatura uguale per ogni tipo di carico |
| Interni | Scatole e cilindri colorati per compartimento | Nessun allagamento visibile |
| Effetti | Sfere d'onda d'urto e di bolla a opacità variabile, schegge | Nessuna sequenza temporale, nessun ambiente subacqueo |
| Ambiente | Sfondo chiaro "sala di controllo", griglia | Manca la modalità atmosferica |

Dati che il modello **già** produce e che la grafica può usare: posizione, resa e distanza
di ogni carica; raggio di rottura; picco di pressione (Cole), impulso e costante di
decadimento θ; raggio e primo periodo della bolla; scoppio sotto chiglia e contatto con la
bolla; gravità per compartimento e per zona esterna; allagamento nel tempo (curve a sfogo
libero e con aria intrappolata, volumi, aree delle falle); nafta, cloro, emersione forzata,
collasso idrostatico; tempo di discesa e deriva; `severityAtPoint(x, y, z, strato)` per
qualsiasi punto.

## 2. Principi

1. **Il calcolo resta sullo scafo parametrico.** Il modello Thrixel è il rivestimento:
   riceve il danno campionando lo stesso campo (`severityAtPoint`) nei propri vertici,
   già allineati al sistema del calcolo da `BoatModel.tsx`.
2. **Un'unica linea del tempo** derivata dal risultato, funzione pura e testabile, che
   guida tutta la grafica. Niente effetti "a sentimento" con durate inventate.
3. **Tempo a più scale.** L'onda d'urto vive in millisecondi, la bolla in decimi di
   secondo, l'allagamento in minuti. La riproduzione usa segmenti con rallentamento
   dichiarato a schermo (come già fa `WaveReport.slow`), non una scala unica falsata.
4. **Due rese, stesso dato.** *Controllo* (analitica, sfondo chiaro, campi e isolinee) e
   *Atlantico* (atmosferica, acqua, luce, particelle). Il passaggio non cambia i numeri.
5. **Deterministico.** Ogni casualità (schegge, bolle, nafta) con seme derivato dal caso,
   così due esecuzioni dello stesso caso danno la stessa immagine e gli screenshot di
   verifica sono confrontabili.
6. **Sorgenti dichiarate** per ogni nuova grandezza fisica, con test in `tests/` come per
   il modello attuale.

## 3. Architettura

```
src/sim/
  model.ts          (esistente) esito statico
  timeline.ts       NUOVO: eventi e curve nel tempo derivati da SimResult
  response.ts       NUOVO: risposta della lamiera, frusta dello scafo, getto della bolla
  hydrostatics.ts   NUOVO: assetto e affondamento da acqua imbarcata
src/render/         NUOVO livello grafico, separato dai componenti UI
  damageField.ts    campionamento del danno su qualsiasi mesh (parametrica o Thrixel)
  hullMaterial.ts   materiale dello scafo con danno in shader
  water/            ambiente subacqueo, superficie, particelle
  effects/          onda d'urto, bolla, getto, schegge, nafta, cloro, allagamento
  player.ts         orologio di riproduzione (play, pausa, scorrimento, velocità)
```

`Scene.tsx` (oggi 1 066 righe) viene spezzato: il palco resta un componente, il danno e
gli effetti passano in `src/render/`.

## 4. Fasi

### Fase 0 — Fondazioni grafiche
- Post-processing (`@react-three/postprocessing`): tone mapping, bloom per lampi e
  incandescenza, occlusione ambientale, vignettatura leggera; tutto disattivabile.
- Ambiente *Atlantico*: colore e assorbimento dell'acqua in funzione della quota
  dell'asse (la luce cala con la profondità reale del caso), nebbia volumetrica, raggi
  dalla superficie, sedimento sospeso in particelle istanziate, caustiche sul ponte a
  bassa quota.
- Preset di qualità (alto / medio / mobile) e misura dei fotogrammi; ripiego senza WebGL
  già presente.
- Parametro `?t=` nell'URL per fissare la linea del tempo: serve agli screenshot di
  verifica.

### Fase 1 — Battelli Thrixel nello Studio, con il danno sopra
- `BoatModel` nella scena dello Studio al posto del fasciame parametrico (che resta per
  raggi X, sezione e come superficie di clic).
- `damageField.ts`: per ogni vertice del modello Thrixel calcola gravità e distanza dallo
  squarcio più vicino; li salva come attributi della geometria.
- `hullMaterial.ts` (shader su `MeshStandardMaterial`): vernice che si scurisce e
  bolla, ruggine e annerimento per gravità; **squarci senza ricostruire la mesh** (i
  frammenti dentro il raggio dello squarcio vengono scartati nello shader), con bordo
  strappato da rumore; ammaccature come spostamento lungo la normale.
- Le mesh Thrixel sono rade per le ammaccature: si valuta in un prototipo se bastano o se
  serve una ritassellatura offline di `hull` e `deck_casing` (script Node in `scripts/`).
- Varianti 1941/1944 già pronte: si collega il selettore d'epoca dello Studio.

### Fase 2 — Danno strutturale coerente con il carico

**Stato (24/11/2026): fatta in parte**, fonti in `docs/FONTI-LAMIERA.md`. Mesh dei modelli
Thrixel infittite al caricamento (VIIC da 30 000 a 135 000 triangoli); cuscini fra le
ordinate con freccia di Nurick–Martin (aggiornamento Yuen 2017) al vero e passo delle
ordinate dalle fonti di guerra; squarci a petali (4–6, Wierzbicki 1999) ancorati al
rivestimento e piegati verso l'interno. **Non fatto**: schegge balistiche in acqua, stato
delle paratie (il modello non lo calcola). **Aperto**: spessori del catalogo contro le
misure di guerra (VIIC 22 mm sull'U-570, XXI 26/18 mm).
- `response.ts`: deformazione permanente della lamiera da impulso e spessore (numero di
  danno adimensionale alla Nurick–Martin), così che a parità di gravità un colpo vicino e
  breve e uno lontano e lungo lascino forme diverse.
- Squarci a petali: numero e verso dei petali dal tipo di carico (contatto, getto della
  bolla, onda d'urto); lamiera rovesciata verso l'interno.
- Ammaccature "a cuscino" fra le ordinate (passo delle ordinate da aggiungere al
  catalogo, con fonte) invece del cratere radiale unico.
- Schegge e frammenti con traiettoria balistica in acqua (resistenza, affondamento).
- Paratie: stato visibile (piegata, tenuta, ceduta) per compartimento.

### Fase 3 — Ricostruzione nel tempo

**Stato (24/11/2026): 3a fatta.** `src/sim/timeline.ts` (con test), lettore con `?t=`,
barra del tempo con fattore di scala, cariche in discesa con deriva, lampo, fronti
d'urto a 1 490 m/s con pressione di Cole, bolla con raggio e periodo del modello
(cicli successivi e risalita dichiarati come resa), danno che compare all'arrivo
dell'onda, lettura dell'allagamento del locale peggiore.
**3b fatta**, fonti in `docs/FONTI-RISPOSTA.md`: anisotropia della bolla e regime del
getto (Supponen 2016, Subramanian 2024), cicli e risalita (Riley 2010, Brainard 2015),
frequenza a 2 nodi e risonanza (Yin 2014, Stettler 1995, Vernon 1986), tipo di eruzione e
cupola in superficie (Mellor 1986 da Young 1971); pannello "Bolla, scafo e superficie".
Restano dichiarati come resa: ampiezza della frusta (×10 a schermo, smorzamento 5%),
forma della curva nel ciclo, risalita nel terzo ciclo. Costante del raggio della bolla
allineata a 3,50 (Swisdak 1978). Aperti: il getto non entra nell'indice di danno; il fasciame
parametrico (vista senza modello 3D) non mostra comparsa del danno né frusta.

- `timeline.ts`: discesa delle cariche (velocità reale e deriva) → scoppio → arrivo
  dell'onda sul Druckkörper (tempo di volo a 1 490 m/s) → oscillazioni della bolla (primo
  periodo dal modello, ampiezze smorzate, risalita) → eventuale getto verso lo scafo se la
  bolla è vicina → frusta dello scafo → allagamento.
- Riproduzione con barra del tempo, segmenti a scala diversa e rallentamento scritto a
  schermo; grafici del rapporto sincronizzati (pressione nel tempo nel punto scelto).
- Lampo di scoppio, fronte d'urto con la pressione di Cole al suo raggio, bolla che pulsa
  e collassa, cavitazione, cupola e spruzzo in superficie per gli scoppi poco profondi.
- Frusta dello scafo: ampiezza dal confronto fra periodo della bolla e primo modo
  flessionale dello scafo (stima a trave, da aggiungere al modello).

### Fase 4 — Conseguenze
- Acqua che sale nei compartimenti secondo le curve `flood.series` (piano d'acqua tagliato
  dentro il cilindro), aria che sfiata dalle falle.
- `hydrostatics.ts`: assetto (appoppamento o appruamento) e perdita di quota dall'acqua
  imbarcata contro la riserva di galleggiabilità; il battello si inclina e scende davvero.
- Cloro: nebbia verdastra nei locali delle batterie quando il modello lo segnala.
- Nafta: chiazza che risale in superficie dalle casse esterne lesionate.
- Collasso idrostatico: implosione del Druckkörper oltre la quota di calcolo.

### Fase 5 — Lettura analitica
- Isosuperfici del campo di gravità (soglie scossa, falle, allagamento, rottura) e mappa
  sullo scafo.
- Sezione che mostra la deformazione della lamiera.
- Confronto di due casi affiancati con la stessa camera.
- Esportazione di immagini e sequenze.

### Fase 6 — Casi storici ricostruiti
- Gli eventi già catalogati (U-99, U-110, U-505…) riprodotti con la linea del tempo e
  camere guidate, con le parti documentate e quelle ipotizzate sempre separate a schermo.

## 5. Ordine proposto

**Fase 0 e Fase 1 insieme** (sono la priorità dichiarata: resa dei battelli e danno
sopra), poi **Fase 3** (la sequenza nel tempo è ciò che rende leggibile il danno), poi
Fase 2, 4, 5, 6. Ogni fase si chiude con test del modello, smoke test e screenshot a
istanti fissi della linea del tempo.

## 6. Nuova fisica da introdurre (con fonti da verificare)

| Grandezza | Uso | Riferimento indicativo |
|---|---|---|
| Deformazione permanente da impulso | Fase 2 | Nurick & Martin (1989); Cole (1948) |
| Getto della bolla vicino a una parete (distanza adimensionale) | Fase 3 | Blake & Gibson (1987) |
| Migrazione verticale della bolla | Fase 3 | Cole (1948) |
| Frusta: primo modo flessionale dello scafo | Fase 3 | Keil (1961) |
| Assetto da acqua imbarcata | Fase 4 | Idrostatica navale di base |
| Passo delle ordinate per classe | Fase 2 | Rössler; piani US Navy dell'U-570 |

I riferimenti vanno controllati prima di entrare nel codice, come per il modello attuale.

## 7. Decisioni (24/11/2026)

1. **Piattaforma: solo PC.** Budget grafico da desktop: post-processing, ombre e
   particelle non vanno limitati per il mobile. I preset di qualità restano per le
   macchine meno potenti.
2. **Ricostruzione: riproduzione automatica** di qualche decina di secondi, con la barra
   del tempo sempre disponibile per fermare e scorrere.
3. **Interni: entrambe le viste.** Interni dettagliati (modelli Thrixel per sala diesel,
   motori elettrici, centrale, camere di lancio, alloggi e batterie), utili soprattutto
   per l'allagamento della Fase 4; lo schema colorato attuale resta come lettura
   analitica. Costo stimato 6–8 modelli da 30–45 cubi: si fanno all'inizio della Fase 4,
   verificando prima il budget.
4. **Mare: sì, disattivabile.** Superficie accesa di default nella resa *Atlantico*,
   spento in *Controllo*; servirà anche per nafta ed emersione forzata (Fase 4).
