import Link from "next/link";
import Backdrop from "@/components/Backdrop";

/**
 * Česká 404. Nejčastější cesta sem je překlep v osobním odkazu, takže se
 * stránka snaží poradit — a vědomě neprozradí, které odkazy existují.
 */
export const metadata = { title: "Pipi Tree — tady nic není" };

export default function NotFound() {
  return (
    <>
      <Backdrop />
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 text-center">
        <h1 className="display anim-wobble text-5xl">Ajaj!</h1>

        <section className="mt-6 rounded-3xl border-4 border-gold/70 bg-night/85 p-6 backdrop-blur-md">
          <div className="anim-wobble text-6xl">🎅</div>
          <p className="mt-4 text-xl font-bold">Tahle stránka tu není.</p>
          <p className="mt-2 text-cream/85">
            Nejspíš je v odkazu překlep. Má v sobě tvoje jméno malými písmeny,
            dohromady a bez háčků — třeba{" "}
            <code className="rounded bg-night px-1.5 py-0.5 text-gold">
              …/jannovak
            </code>
            .
          </p>
          <p className="mt-2 text-sm text-cream/75">
            Zkus ho zkopírovat celý znovu, nebo se ozvi tomu, kdo losování
            připravoval.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block font-bold text-frost underline hover:text-gold"
          >
            ← na začátek
          </Link>
        </section>
      </main>
    </>
  );
}
