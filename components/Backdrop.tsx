import PaperScene from "@/components/PaperScene";
import Snow from "@/components/Snow";

/**
 * Pozadí pro všechny stránky hry: papírová vánoční krajina a sněžení.
 *
 * Dřív tu byla fotka stromečku. Papírová scéna je vlastní kresba v barvách
 * aplikace, takže nepotřebuje ztmavovací závoj ani licenci k fotce. Obsah
 * stránek leží na tmavých panelech, proto mu světlá závěj dole nevadí.
 */
export default function Backdrop() {
  return (
    <>
      <PaperScene />
      <Snow />
    </>
  );
}
