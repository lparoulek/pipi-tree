"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useState } from "react";
import type { Person } from "@/lib/db/queries/game";

/**
 * Výběr vlastního jména ze seznamu.
 *
 * Osobní odkazy (`/jannovak`) fungují dál, ale ne každý si s adresou
 * v prohlížeči poradí — tohle je hlavní cesta do hry: najdi se v seznamu
 * a klikni.
 *
 * Po kliknutí přijde **potvrzení**, aby překliknutí na cizí jméno nespotřebovalo
 * někomu los. Teprve potvrzení vede na osobní stránku, kde se losuje.
 */

export default function VyberJmena({ people }: { people: Person[] }) {
  const [zvoleny, setZvoleny] = useState<Person | null>(null);

  if (people.length === 0) {
    return (
      <Panel>
        <div className="text-5xl">🫥</div>
        <p className="mt-3 text-xl font-bold">Zatím tu nikdo není.</p>
        <p className="mt-2 text-cream/80">
          Organizátor musí nejdřív zadat seznam lidí.
        </p>
      </Panel>
    );
  }

  if (zvoleny) {
    return (
      <Panel className="anim-pop">
        <div className="anim-wobble text-5xl">🎁</div>
        <h2 className="display mt-3 text-2xl">Jsi to ty?</h2>
        <p className="display my-4 text-4xl break-words sm:text-5xl">{zvoleny.name}</p>
        <p className="text-sm text-cream/75">
          Vyber jen sám sebe — cizím jménem bys zkazil překvapení sobě i jemu.
        </p>

        {/* Stejné dlaždice jako v seznamu jmen, ať to drží jeden vzhled. */}
        <div className="mt-6 flex flex-col gap-3">
          {/* Opravdový odkaz, ne tlačítko s JS — funguje, i kdyby se stránka
              nezhydratovala, a dá se otevřít na nové kartě. */}
          <Link
            href={`/${zvoleny.slug}`}
            className="tile tile-hero block px-4 py-4 text-lg"
          >
            <StavPotvrzeni />
          </Link>
          <button
            onClick={() => setZvoleny(null)}
            className="tile px-4 py-3 text-base"
          >
            ← Zpět na seznam
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <h2 className="display text-2xl">Kdo jsi?</h2>
      <p className="mt-1 mb-4 text-cream/80">Najdi se v seznamu a klikni na sebe.</p>

      {/*
        Záměrně tu jsou VŠECHNA jména a nikde není vyznačené, kdo už losoval.
        Kdyby se vylosovaní odbarvovali, každý by hned viděl, kolik lidí ještě
        zbývá — a to je přesně to, co se nemá vědět.
      */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {people.map((person) => (
          <button
            key={person.id}
            onClick={() => setZvoleny(person)}
            className="tile px-3 py-4 text-base leading-tight"
          >
            {person.name}
          </button>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Text potvrzovacího tlačítka. Po kliknutí se přepne na „Chystám tvůj los…“,
 * takže je hned vidět, že se něco děje — cesta na osobní stránku chvíli trvá.
 *
 * `useLinkStatus` funguje jen uvnitř `<Link>`, proto je to vlastní komponenta.
 */
function StavPotvrzeni() {
  const { pending } = useLinkStatus();
  return <>{pending ? "Chystám tvůj los… ⏳" : "Ano, to jsem já"}</>;
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border-4 border-gold/70 bg-night/85 p-6 text-center backdrop-blur-md ${className}`}
    >
      {children}
    </section>
  );
}
