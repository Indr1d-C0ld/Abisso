import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Post-processing. Con il composer il tone mapping del renderer non arriva più allo
 * schermo, quindi è un effetto esplicito (ACES, come prima).
 * - Controllo: tone mapping e antialiasing, lettura neutra.
 * - Atlantico: occlusione ambientale (qualità alta), bloom sui lampi, vignettatura leggera.
 * Il composer non accetta figli vuoti: ogni combinazione è una lista esplicita.
 */
export function PostFX({ mode, quality }: { mode: "controllo" | "atlantico"; quality: "alta" | "media" }) {
  if (mode === "controllo") {
    return (
      <EffectComposer multisampling={0}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    );
  }
  if (quality === "media") {
    return (
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.32} darkness={0.55} />
        <SMAA />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={2.2} intensity={2.2} distanceFalloff={0.6} quality="medium" />
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  );
}
