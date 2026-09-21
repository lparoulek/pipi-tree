/**
 * Konfety při odhalení losu. Pozice zase deterministické (viz Snow) —
 * komponenta se montuje až po interakci, ale kdyby ji někdy renderoval
 * server, nemá se co rozejít.
 */

const COLORS = ["bg-holly", "bg-gold", "bg-frost", "bg-candy", "bg-pine", "bg-plum"] as const;

function deterministic(count: number) {
  let seed = 424242;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  return Array.from({ length: count }, (_, i) => ({
    key: i,
    left: next() * 100,
    // Kladné zpoždění je tu v pořádku — konfety mají opravdu odletět postupně
    // a `animation-fill-mode: both` je do té doby drží mimo obraz.
    delay: next() * 1.2,
    duration: 2.4 + next() * 2.4,
    size: 6 + next() * 10,
    color: COLORS[Math.floor(next() * COLORS.length)],
    round: next() > 0.6,
  }));
}

const PIECES = deterministic(70);

export default function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {PIECES.map((p) => (
        <span
          key={p.key}
          className={`anim-confetti absolute top-0 ${p.color} ${
            p.round ? "rounded-full" : "rounded-[2px]"
          }`}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
