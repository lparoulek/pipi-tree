/**
 * Padající vločky. Pozice jsou generované deterministicky (LCG s pevným
 * semínkem) a ne přes `Math.random()` — ten by na serveru a v prohlížeči dal
 * jiná čísla a React by hlásil hydration mismatch.
 */

const FLAKES = ["❄", "❅", "❆", "✦", "•"] as const;

function deterministic(count: number) {
  let seed = 20261224;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  return Array.from({ length: count }, (_, i) => {
    const left = next() * 100;
    const progress = next();
    const duration = 9 + next() * 11;
    return {
      key: i,
      left,
      duration,
      /**
       * Zpoždění je **záporné**, takže každá vločka startuje už rozletěná
       * v jiné fázi svého cyklu. S kladným zpožděním CSS do jeho konce
       * vykresluje nezanimovaný stav — všechny vločky by staticky ležely
       * nahoře a postupně „mizely“, jak by se jim animace rozbíhala.
       */
      delay: -(progress * duration),
      size: 0.7 + next() * 1.4,
      drift: -6 + next() * 12,
      glyph: FLAKES[Math.floor(next() * FLAKES.length)],
      opacity: 0.45 + next() * 0.5,
    };
  });
}

const SNOWFLAKES = deterministic(45);

export default function Snow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[2] overflow-hidden">
      {SNOWFLAKES.map((f) => (
        <span
          key={f.key}
          className="anim-snow absolute top-0 text-cream select-none"
          style={{
            left: `${f.left}%`,
            fontSize: `${f.size}rem`,
            opacity: f.opacity,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            ["--drift" as string]: `${f.drift}rem`,
          }}
        >
          {f.glyph}
        </span>
      ))}
    </div>
  );
}
