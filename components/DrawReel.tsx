"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Výherní válec se jmény.
 *
 * Předchozí verze jen přeblikávala text, což vypadalo lacině. Tady se jména
 * opravdu rolují, válec postupně zpomaluje a **dojede přesně na vylosované
 * jméno** — teprve pak se odhalí celý los.
 *
 * Časování má tři fáze, ať to má dramaturgii:
 *   1. rozjezd    — dárky se přemíchávají, válec se rozbíhá
 *   2. rychlá jízda — jména se míhají, čeká se na odpověď serveru
 *   3. dojezd     — zpomalení na cíl a krátké podržení
 *
 * Tajnost: válec roluje **všechna** jména, ne jen ta zbývající. Kdyby v něm
 * byli jen lidé, kteří ještě dárek nedostali, dal by se z něj vyčíst stav hry.
 */

const ITEM_H = 68;
const INTRO_MS = 900;
const MIN_SPIN_MS = 1900;
const LAND_MS = 2200;
const HOLD_MS = 600;
const SPEED = 1500; // px/s při rychlé jízdě

/** Kolikrát se seznam jmen zopakuje — pás je díky tomu periodický. */
const REPEATS = 30;

type Stage = "intro" | "spin" | "landing" | "done";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export default function DrawReel({
  names,
  target,
  onFinished,
}: {
  /** Všechna jména ve hře. */
  names: string[];
  /** Vylosované jméno. `null`, dokud server neodpoví — válec zatím jede dál. */
  target: string | null;
  onFinished: () => void;
}) {
  const strip = names.length > 0 ? names : ["…"];
  const cycle = strip.length * ITEM_H;

  const [pos, setPos] = useState(0);
  const [stage, setStage] = useState<Stage>("intro");

  // V refech, protože je čte animační smyčka a nesmí ji restartovat.
  // `onFinished` tu **musí** být taky: efekt běží jednou a zachytil by callback
  // z prvního renderu, kterému ještě nebyl znám vylosovaný člověk.
  const targetRef = useRef<string | null>(target);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);

  // Aktualizace v efektu, ne při renderu: zápis do refu během renderu React
  // nedovoluje, protože se tím rozbije souběžné renderování. Efekt bez pole
  // závislostí běží po každém renderu, takže refy drží vždy poslední hodnotu.
  useEffect(() => {
    targetRef.current = target;
    onFinishedRef.current = onFinished;
  });

  useEffect(() => {
    // Komu animace vadí, tomu ji nevnucujeme — krátká pauza a hotovo.
    if (prefersReducedMotion()) {
      const t = setTimeout(() => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          setStage("done");
          onFinishedRef.current();
        }
      }, 700);
      return () => clearTimeout(t);
    }

    const started = performance.now();
    let raf = 0;
    let last = started;
    let current = 0;

    // Nastaví se, až server odpoví a odbyde si minimální doba jízdy.
    let landFrom = 0;
    let landTo = 0;
    let landStart = 0;

    const tick = (now: number) => {
      const elapsed = now - started;
      const dt = (now - last) / 1000;
      last = now;

      if (landStart === 0) {
        // Rozjezd a rychlá jízda. Rychlost se plynule nabírá, ať to neškubne.
        const ramp = Math.min(elapsed / INTRO_MS, 1);
        current += SPEED * ramp * ramp * dt;

        // Pás je periodický, takže odečtení celých cyklů je vizuálně neviditelné
        // a drží `current` v rozumných číslech.
        const limit = cycle * (REPEATS - 6);
        if (current > limit) current -= cycle * (REPEATS - 12);

        const hitName = targetRef.current;
        if (hitName && elapsed > INTRO_MS + MIN_SPIN_MS) {
          // Najdi nejbližší výskyt cíle, který je dost daleko na plynulý dojezd.
          const indexInCycle = strip.indexOf(hitName);
          const minAhead = current + SPEED * 0.9;
          let candidate = Math.floor(minAhead / cycle) * cycle + indexInCycle * ITEM_H;
          if (candidate < minAhead) candidate += cycle;

          landFrom = current;
          landTo = candidate;
          landStart = now;
          setStage("landing");
        }
        setPos(current);
        raf = requestAnimationFrame(tick);
        return;
      }

      // Dojezd na cíl.
      const t = Math.min((now - landStart) / LAND_MS, 1);
      setPos(landFrom + (landTo - landFrom) * easeOutCubic(t));

      if (t >= 1) {
        setStage("done");
        if (!finishedRef.current) {
          finishedRef.current = true;
          setTimeout(() => onFinishedRef.current(), HOLD_MS);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const introTimer = setTimeout(() => setStage("spin"), INTRO_MS);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(introTimer);
    };
    // Záměrně jednorázově: animace si vede vlastní čas a cíl čte z refu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = Array.from({ length: REPEATS * strip.length }, (_, i) => strip[i % strip.length]);
  const label =
    stage === "intro"
      ? "Míchám dárky…"
      : stage === "spin"
        ? "Kdo to asi bude?"
        : stage === "landing"
          ? "Už to bude…"
          : "A je to!";

  return (
    <div className="text-center">
      <p className="text-xl font-bold text-frost">{label}</p>

      {/* Týž dárek jako na tlačítku — nejdřív se s ním třese, pak se jen pohupuje. */}
      <div className={`my-5 text-6xl ${stage === "intro" ? "anim-shake" : "anim-wobble"}`}>
        🎁
      </div>

      {/* Okénko válce — vidět jsou tři řádky, prostřední je ten hrající. */}
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border-4 border-gold bg-night/80"
        style={{ height: ITEM_H * 3 }}
        aria-hidden
      >
        <div
          style={{ transform: `translateY(${ITEM_H - (pos % (cycle * REPEATS))}px)` }}
          className="will-change-transform"
        >
          {items.map((name, i) => (
            <div
              key={i}
              className="display flex items-center justify-center px-3 text-3xl text-cream/35"
              style={{ height: ITEM_H }}
            >
              {name}
            </div>
          ))}
        </div>

        {/*
          Krajní řádky se zastíní gradientem, prostřední slot dostane rámeček
          a nasvícení — teprve tím je poznat, kde se „hraje“. Pořadí vrstev je
          důležité: stínění musí být POD rámečkem, jinak ho překryje.
        */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-night via-transparent to-night" />
        <div
          className="pointer-events-none absolute inset-x-0 border-y-[3px] border-gold bg-gold/10"
          style={{ top: ITEM_H, height: ITEM_H }}
        />
        {/* Po dojezdu slot zlatě zasvítí. */}
        <div
          className={`pointer-events-none absolute inset-x-0 transition-shadow duration-500 ${
            stage === "done" ? "shadow-[inset_0_0_32px_10px_rgba(255,210,63,0.5)]" : ""
          }`}
          style={{ top: ITEM_H, height: ITEM_H }}
        />
        {/* Ukazatele po stranách prostředního slotu. */}
        <div
          className="pointer-events-none absolute text-2xl text-gold"
          style={{ top: ITEM_H + ITEM_H / 2 - 18, left: 4 }}
        >
          ▸
        </div>
        <div
          className="pointer-events-none absolute text-2xl text-gold"
          style={{ top: ITEM_H + ITEM_H / 2 - 18, right: 4 }}
        >
          ◂
        </div>
      </div>

      <p className="mt-4 text-sm text-cream/60">
        {stage === "done" ? "Drž se…" : "Zatím se nedívej nikomu přes rameno 🤫"}
      </p>
    </div>
  );
}
