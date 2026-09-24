"use client";

import { useEffect, useRef } from "react";

/**
 * Paralaxa papírové scény: vrstvy se posouvají proti pohybu myši, bližší víc.
 *
 * Komponenta jen zapisuje polohu myši do `--px` a `--py` (−1 až 1). Jak moc
 * se která vrstva hne, určuje její `--hloubka` v CSS (`.papir-vrstva`), takže
 * React se při pohybu vůbec nepřekresluje — mění se jen dvě proměnné.
 *
 * Poloha se k myši dotahuje plynule (`requestAnimationFrame`), jinak by
 * scéna cukala po pixelech. Smyčka běží, jen dokud je kam dojíždět.
 *
 * Jen pro myš: na dotyku by se scéna škubala při každém posunu stránky.
 * A nic, když uživatel nechce pohyb (`prefers-reduced-motion`).
 */
export default function PaperParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const bezPohybu = matchMedia("(prefers-reduced-motion: reduce)");
    const cil = { x: 0, y: 0 };
    const ted = { x: 0, y: 0 };
    let snimek = 0;

    const krok = () => {
      ted.x += (cil.x - ted.x) * 0.08;
      ted.y += (cil.y - ted.y) * 0.08;
      el.style.setProperty("--px", ted.x.toFixed(4));
      el.style.setProperty("--py", ted.y.toFixed(4));
      const hotovo = Math.abs(cil.x - ted.x) < 0.001 && Math.abs(cil.y - ted.y) < 0.001;
      snimek = hotovo ? 0 : requestAnimationFrame(krok);
    };
    const dojed = (x: number, y: number) => {
      cil.x = x;
      cil.y = y;
      if (!snimek) snimek = requestAnimationFrame(krok);
    };

    const pohyb = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || bezPohybu.matches) return;
      dojed((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    };
    // Když myš opustí okno, scéna se v klidu vrátí doprostřed.
    const odchod = () => dojed(0, 0);

    window.addEventListener("pointermove", pohyb, { passive: true });
    document.documentElement.addEventListener("mouseleave", odchod);
    bezPohybu.addEventListener("change", odchod);
    return () => {
      cancelAnimationFrame(snimek);
      window.removeEventListener("pointermove", pohyb);
      document.documentElement.removeEventListener("mouseleave", odchod);
      bezPohybu.removeEventListener("change", odchod);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {children}
    </div>
  );
}
