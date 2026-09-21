import Backdrop from "@/components/Backdrop";

/**
 * Okamžitá odezva při přechodu na osobní stránku.
 *
 * `/[slug]` je dynamická a sahá do databáze, takže mezi kliknutím na
 * „Ano, to jsem já“ a vykreslením je prodleva — v `next dev` navíc sekundy,
 * protože se routa teprve kompiluje. Bez tohohle souboru Next po dobu
 * navigace nezobrazí nic a uživatel netuší, jestli se něco děje.
 *
 * Dokumentace Next.js to doporučuje jako hlavní řešení: „Prefer route-level
 * fallbacks with loading.js.“
 */
export default function Loading() {
  return (
    <>
      <Backdrop />
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 text-center">
        <section className="rounded-3xl border-4 border-gold/70 bg-night/85 p-8 backdrop-blur-md">
          <div className="anim-wobble text-6xl">🎁</div>
          <p className="display mt-4 text-2xl">Chystám tvůj los…</p>
          <p className="mt-2 text-cream/70">Chvilku vydrž.</p>
        </section>
      </main>
    </>
  );
}
