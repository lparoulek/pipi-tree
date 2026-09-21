import Backdrop from "@/components/Backdrop";
import VyberJmena from "@/components/VyberJmena";
import { isDatabaseConfigured } from "@/lib/db/client";
import { listParticipants, type Person } from "@/lib/db/queries/game";
import {
  CENA_DARKU,
  datumCesky,
  odpocet,
  PIPI_UDALOST,
  type Odpocet,
} from "@/lib/game/countdown";

/**
 * Hlavní stránka: odpočet do oslavy a výběr vlastního jména.
 *
 * Hlavní cesta do hry je výběr ze seznamu — ne každý si poradí se zadáváním
 * adresy v prohlížeči. Osobní odkazy (`/jannovak`) fungují dál pro toho, kdo
 * je má.
 *
 * `force-dynamic`: staticky vygenerovaná stránka by zamrazila počet dní na den
 * buildu a neukázala by nově zadaná jména.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pipi Tree — vánoční losování dárků",
};

export default async function Home() {
  const stav = odpocet(new Date());

  let people: Person[] = [];
  let chybaDatabaze = false;

  if (isDatabaseConfigured()) {
    try {
      people = await listParticipants();
    } catch (error) {
      console.error("[home] nepodařilo se načíst seznam lidí", error);
      chybaDatabaze = true;
    }
  } else {
    chybaDatabaze = true;
  }

  return (
    <>
      <Backdrop />
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-4 text-center">
        <header className="pt-4">
          <h1 className="display anim-wobble text-5xl sm:text-6xl">Pipi Tree</h1>
          <p className="mt-1 text-lg font-bold text-frost">
            🎄 Vánoční losování dárků 🎁
          </p>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-4 py-6">
          <Odpocitavani stav={stav} />

          {chybaDatabaze ? (
            <section className="rounded-3xl border-4 border-gold/70 bg-night/85 p-6 backdrop-blur-md">
              <div className="text-5xl">😕</div>
              <p className="mt-3 text-xl font-bold">Hra se teď nenačte.</p>
              <p className="mt-2 text-cream/80">
                Zkus to prosím za chvíli, nebo se ozvi organizátorovi.
              </p>
            </section>
          ) : (
            <VyberJmena people={people} />
          )}
        </div>
      </main>
    </>
  );
}

/**
 * Odpočet do Pipiových Vánoc — tedy do **oslavy**, ne do konce losování.
 * Losovat se dá kdykoli předem, datum je den, kdy se sejdou a dárky se rozdají.
 */
function Odpocitavani({ stav }: { stav: Odpocet }) {
  return (
    <section className="rounded-3xl border-4 border-gold/70 bg-night/85 p-6 backdrop-blur-md">
      <h2 className="display text-2xl">{PIPI_UDALOST}</h2>
      <p className="mt-1 font-bold text-frost">{datumCesky()}</p>

      {stav.state === "pred" && (
        <p className="mt-4">
          <span className="block text-lg font-bold text-cream/85">{stav.verb}</span>
          <span className="display block text-6xl leading-none sm:text-7xl">
            {stav.days}
          </span>
          <span className="mt-1 block text-lg font-bold text-cream/85">
            {stav.unit}
          </span>
        </p>
      )}

      {stav.state === "dnes" && (
        <p className="display anim-wobble mt-4 text-4xl">Dnes je to tady! 🎉</p>
      )}

      {stav.state === "po" && (
        <p className="mt-4 text-lg font-bold text-cream/85">
          Už bylo — a to před {stav.days === 1 ? "dnem" : `${stav.days} dny`}. 🎁
        </p>
      )}

      <p className="mt-5 border-t border-gold/30 pt-4 font-bold text-gold">
        🎁 Dárek za {CENA_DARKU} Kč
      </p>
    </section>
  );
}
