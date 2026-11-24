# Modelli 3D

Generati con Thrixel, progetto "ABISSO".
Unità glTF = metri, Y in alto. Texture WebP: 1024 px per gli ordigni, 2048 px per gli scafi.

I modelli sono **rivestimenti visivi**: il calcolo usa solo i dati in `src/data/` e la
geometria parametrica in `src/sim/shape.ts`. Le misure date al generatore sono marcate:

- **verificata**: da fonte aperta citata;
- **dal catalogo**: dai dati dell'app (`src/data/boats.ts`), a loro volta da Rössler / Gröner;
- **stima di studio**: ricavata da peso, calibro o tubo di lancio, perché NavWeaps e
  Wikipedia (consultati il 24/11/2026) non danno lunghezza e diametro. Da verificare su
  manuali d'ordinanza (es. Friedman, *US Naval Weapons*).

## Ordigni

Tamburi: asse lungo Z, rotolano. Corpi affusolati: punta su +Z, salvo il Mark 9 (punta su +Y).

| File | Oggetto | Misure | Stato | Thrixel |
|---|---|---|---|---|
| `mk7.glb` | Mark VII (RN), tamburo con pistola idrostatica | 0,45 × 0,71 m | stima di studio, coerente con la foto IWM della HMS Dianthus | `afb18866` → ridotto `1c8b88c7` |
| `mk7-heavy.glb` | Mark VII Heavy: + zavorra di ghisa da 150 lb (68 kg) | 0,45 × 0,78 m | peso verificato (NavWeaps, Wikipedia); forma e fissaggio del disco sono ipotesi | edit `9e27346a` → ridotto `2b90860e` |
| `us-mk6.glb` | US Navy Mark 6, "ash can", 300 lb TNT | 0,45 × 0,70 m | stima di studio | `84e29200` |
| `us-mk7.glb` | US Navy Mark 7, 600 lb TNT | 0,56 × 0,80 m | stima di studio (da peso, 745 lb) | `b577e9cf` |
| `us-mk9.glb` | US Navy Mark 9 a goccia, pinne inclinate e anello di coda | 0,43 × 0,90 m | forma verificata (NavWeaps: goccia saldata a spicchi, pinne per la rotazione); misure stima di studio | `7c151fde` |
| `mk10.glb` | Mark X da tubo lanciasiluri da 21 in | 0,53 × 3,8 m | diametro dal tubo; lunghezza stima da peso (3 000–3 050 lb) | `994a7930` |
| `hedgehog.glb` | Proietto Hedgehog, 65 lb | 1,181 × 0,183 m | **verificata** (Wikipedia, infobox; diametro 7–7,2 in a seconda della fonte) | `fcf65a29` |
| `squid.glb` | Bomba Squid, 390 lb | 0,30 × 1,50 m | stima di studio (calibro 12 in della canna, lunghezza da peso) | `6daf4096` |

## Battelli

Configurazione 1941–42 per VII e IX (cannone sul ponte), 1945 per il XXI. Un modello per
famiglia: tutti i VII (VIIB, VIIC, VIIC/41 e i battelli storici) usano il VIIC, tutti i IX l'IXC.

Il generatore ha dato lunghezza e baglio giusti ma un'opera morta troppo alta (il VIIC usciva
alto 12,6 m; le schede correnti danno circa 9,6 m, valore non ancora verificato su fonte). `BoatModel.tsx` riporta perciò l'altezza chiglia–ponte di
`hull` + `deck_casing` su quella dello scafo parametrico: il rivestimento coincide con la
geometria del calcolo (verificabile in Archivio → Modelli 3D, "Scafo di calcolo").
Nel IIB il `jumping_wire` è generato fuori asse e viene nascosto.

| File | Classe | Lunghezza × baglio × pescaggio | Stato | Thrixel |
|---|---|---|---|---|
| `uboat-iib.glb` | Tipo IIB | 42,7 × 4,08 × 3,9 m | dal catalogo; altezza corretta in codice (×0,85): due edit falliti | `2ea80a3a` |
| `uboat-viic.glb` | Tipo VIIC 1941 | 67,1 × 6,2 × 4,74 m | dal catalogo; altezza corretta con edit | `1a6f0ec1` → edit `8a86a74b` → ridotto `f9000989` |
| `uboat-viic-1944.glb` | Tipo VIIC 1944: Wintergarten, schnorchel, senza cannone | come sopra | edit del precedente; texture più scura | `c9254d52` → ridotto `ab02dd2a` |
| `uboat-ixc.glb` | Tipo IXC 1942 | 76,8 × 6,76 × 4,7 m | dal catalogo; altezza corretta con edit | `2b27621b` → edit `6d4df89a` → ridotto `de3874bb` |
| `uboat-ixc-1944.glb` | Tipo IXC 1944: Wintergarten, schnorchel, senza cannone | come sopra | edit del precedente | `2d036a5e` → ridotto `5788e30f` |
| `uboat-xb.glb` | Tipo XB | 89,8 × 9,2 × 4,71 m | dal catalogo; altezza corretta con edit (esatta) | `b506c449` → edit `fc5b4aa9` → ridotto `00fe4856` |
| `uboat-xxi.glb` | Tipo XXI | 76,7 × 6,6 × 6,32 m | dal catalogo; altezza corretta con edit (esatta), vela allungata | `80b0dc0c` → edit `0ae7eb44` → ridotto `de1105a5` |

## Discrepanze trovate nelle fonti

- Altezza dei battelli: il catalogo dell'app non ha l'altezza; i valori di riferimento
  (es. VIIC ~9,6 m, da verificare) andrebbero aggiunti a `src/data/boats.ts` con la loro fonte.
- US Mark 9: l'app indica ~200 lb di Torpex; NavWeaps dà TNT per Mod 0/1 (200 lb) e Mod 2
  (190 lb), con il Torpex solo a fine guerra; Wikipedia dice Torpex. Da decidere.
- Squid: 390 lb (NavWeaps, testo Wikipedia) contro 440 lb (infobox Wikipedia).
- Mark X: 3 000 lb (Wikipedia) contro 3 050 lb (NavWeaps).
