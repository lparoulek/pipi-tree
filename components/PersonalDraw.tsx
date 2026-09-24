"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { drawAction, type DrawResult } from "@/app/actions";
import type { Assignment, Person } from "@/lib/db/queries/game";
import { CENA_DARKU } from "@/lib/game/countdown";
import Confetti from "@/components/Confetti";
import DrawReel from "@/components/DrawReel";

/**
 * Osobní stránka jednoho člověka (`/jannovak`): zalosovat, nebo si připomenout
 * svůj los.
 *
 * Celá hra je klientská komponenta včetně větvení mezi „zalosovat“ a
 * odhalením. Kdyby se větvilo na serveru, serverový přerender po losu by
 * přestavěl strom a zabil probíhající animaci.
 */

type Phase = "ready" | "spinning" | "revealed" | "blocked";

export default function PersonalDraw({
  person,
  names,
  initialAssignment,
}: {
  person: Person;
  /** Všechna jména pro mlýnek — celý seznam, ať z animace nic neplyne. */
  names: string[];
  /** Los, pokud tenhle člověk už losoval. */
  initialAssignment: Assignment | null;
}) {
  const [phase, setPhase] = useState<Phase>(initialAssignment ? "revealed" : "ready");
  const [assignment, setAssignment] = useState<Assignment | null>(initialAssignment);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Los dorazí ze serveru dřív, než dojede válec. Schová se sem a odhalí se
  // teprve, když animace dojede na jméno.
  const [incoming, setIncoming] = useState<Assignment | null>(null);

  // Při opakované návštěvě je los schovaný — kdyby ti někdo vzal telefon do
  // ruky nebo koukal přes rameno. Po vlastním losu se ukáže hned.
  const [hidden, setHidden] = useState(Boolean(initialAssignment));

  /** Ošetří jen neúspěšné výsledky — úspěch si vyzvedne válec. */
  function applyFailure(result: Exclude<DrawResult, { status: "ok" }>) {
    switch (result.status) {
      case "already-drawn":
        setMessage("Ty už jsi losoval. Obnov stránku a uvidíš svůj los.");
        setPhase("blocked");
        return;
      case "not-ready":
        setMessage("Losování ještě není připravené — organizátor zatím nezadal seznam lidí.");
        setPhase("blocked");
        return;
      case "unknown-person":
        setMessage("Tenhle odkaz už neplatí. Napiš organizátorovi.");
        setPhase("blocked");
        return;
      case "stuck":
        setMessage("Losování se zaseklo. Řekni o tom organizátorovi, je to chyba hry.");
        setPhase("blocked");
        return;
      default:
        setMessage(result.detail);
        setPhase("blocked");
    }
  }

  function draw() {
    setMessage(null);
    setIncoming(null);
    setPhase("spinning");

    startTransition(async () => {
      const result = await drawAction(person.slug);
      if (result.status === "ok") {
        // Válec si toho všimne a začne dojíždět na tohle jméno.
        setIncoming(result.assignment);
        return;
      }
      applyFailure(result);
    });
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-10">
      <Title name={person.name} />

      <div className="flex flex-1 flex-col justify-center">
        {phase === "ready" && <Ready onDraw={draw} disabled={pending} />}
        {phase === "spinning" && (
          <Panel>
            <DrawReel
              names={names}
              target={incoming?.receiverName ?? null}
              onFinished={() => {
                if (!incoming) return;
                setAssignment(incoming);
                setHidden(false);
                setPhase("revealed");
              }}
            />
          </Panel>
        )}
        {phase === "revealed" && assignment && (
          <Reveal
            assignment={assignment}
            hidden={hidden}
            onShow={() => setHidden(false)}
          />
        )}
        {phase === "blocked" && <Blocked message={message} />}
      </div>
    </main>
  );
}

function Title({ name }: { name: string }) {
  return (
    <header className="pt-4 pb-6 text-center">
      <h1 className="display anim-wobble text-5xl sm:text-6xl">Pipi Tree</h1>
      <p className="mt-1 text-lg font-bold text-frost">
        🎄 Ahoj {name}! 🎁
      </p>
    </header>
  );
}

function Ready({ onDraw, disabled }: { onDraw: () => void; disabled: boolean }) {
  return (
    <>
      <Panel className="mb-4">
        <h2 className="display mb-2 text-2xl">Jak se hraje</h2>
        <ol className="space-y-1.5 text-cream/90">
          <li>🎁 Zalosuješ si jednoho člověka, kterého obdaruješ.</li>
          <li>
            🎄 <strong className="text-gold">Dárek musí začínat na stejné písmeno</strong>{" "}
            jako jméno obdarovaného.
          </li>
          <li>
            💰 <strong className="text-gold">Dárek za {CENA_DARKU} Kč.</strong>
          </li>
          <li>🤫 Nikomu svůj los neprozraď — to je celá sranda.</li>
          <li>☝️ Losovat jde jen jednou. Co padne, to platí.</li>
        </ol>
      </Panel>

      <Panel className="text-center">
        <div className="anim-wobble mb-4 text-7xl">🎁</div>
        {/* Stejná dlaždice jako všude jinde, jen se zlatým okrajem jako hlavní volba. */}
        <button
          onClick={onDraw}
          disabled={disabled}
          className="tile tile-hero w-full px-4 py-4 text-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          {disabled ? "Losuju…" : "Losovat! ✨"}
        </button>
      </Panel>
    </>
  );
}

function Reveal({
  assignment,
  hidden,
  onShow,
}: {
  assignment: Assignment;
  hidden: boolean;
  onShow: () => void;
}) {
  if (hidden) {
    return (
      <Panel className="text-center">
        <div className="text-6xl">🎁</div>
        <p className="mt-4 text-xl font-bold">Svůj los už máš.</p>
        <p className="mt-1 text-cream/75">
          Koukni se, až u tebe nikdo nestojí — ať to nikdo nevyzvědí.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={onShow} className="tile tile-hero px-4 py-3 text-lg">
            Zobrazit můj los 👀
          </button>
          <Link href="/" className="tile block px-4 py-3 text-base">
            ← Na začátek
          </Link>
        </div>
      </Panel>
    );
  }

  const { receiverName, letter } = assignment;

  return (
    <>
      <Confetti />
      <Panel className="anim-pop text-center" role="status" ariaLive="polite">
        <p className="text-xl font-bold text-frost">Obdaruješ…</p>

        <p className="display my-4 text-5xl break-words sm:text-6xl">{receiverName}</p>

        <div className="mx-auto max-w-sm rounded-2xl border-4 border-gold bg-night/60 p-4">
          <p className="font-bold text-cream/85">Dárek musí začínat na</p>
          <p className="display my-1 text-7xl">{letter}</p>
        </div>

        <p className="mt-5 text-lg font-bold text-candy">🤫 Nikomu to neříkej!</p>
        <p className="mt-1 text-sm text-cream/70">
          Losovat jde jen jednou — tohle je tvůj konečný los. Na tenhle odkaz se
          můžeš kdykoli vrátit.
        </p>

        {/*
          Každý losuje doma sám, takže tohle není „předání dalšímu“ — jen
          způsob, jak los zavřít a dostat se z obrazovky s tajemstvím.
        */}
        <div className="mt-6">
          <Link href="/" className="tile block px-4 py-3 text-lg">
            Hotovo ✓
          </Link>
        </div>
      </Panel>
    </>
  );
}

function Blocked({ message }: { message: string | null }) {
  return (
    <Panel className="anim-pop text-center">
      <div className="text-6xl">🎅</div>
      <p className="mt-4 text-xl font-bold">{message ?? "Tohle nešlo."}</p>
    </Panel>
  );
}

function Panel({
  children,
  className = "",
  role,
  ariaLive,
}: {
  children: React.ReactNode;
  className?: string;
  role?: string;
  /** Odhalení losu se má čtečkám oznámit — mlýnek se jmény naopak ne. */
  ariaLive?: "polite" | "assertive";
}) {
  return (
    <section
      role={role}
      aria-live={ariaLive}
      className={`rounded-3xl border-4 border-gold/70 bg-night/85 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.55)] backdrop-blur-md ${className}`}
    >
      {children}
    </section>
  );
}
