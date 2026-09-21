/**
 * Odpočítávání do Pipiových Vánoc — tedy do dne, kdy se sejdou a dárky se
 * rozdají. **Není to termín losování**; losovat se dá kdykoli předem.
 *
 * Počítá se **v české časové zóně**, ne podle serveru — na Vercelu běží
 * funkce v UTC, takže večer 17. 12. by server tvrdil, že je ještě 17.,
 * a doma už by byl 18.
 *
 * Datum je natvrdo: je to jeden konkrétní ročník jedné rodinné hry, ne
 * konfigurovatelná aplikace. Na další rok se přepíše tady.
 */

/* --- Fakta o letošní události. Na další rok se mění jen tady. ------------- */

/** Jak se událost jmenuje. */
export const PIPI_UDALOST = "Pipivovy Vánoce na Šolárně";

/** Datum oslavy. */
export const PIPI_VANOCE = "2026-12-19";

/** Cena dárku v korunách. */
export const CENA_DARKU = 500;

const PRAGUE = "Europe/Prague";

/** Číslo dne (počet dní od epochy) pro dané datum v zadané zóně. */
function dayNumberInZone(date: Date, timeZone: string): number {
  // en-CA dává ISO tvar „2026-09-21“, což se dobře rozebírá.
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);

  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Kolik dní zbývá do `target` (ISO „RRRR-MM-DD“). Negativní = už bylo. */
export function daysUntil(
  target: string,
  now: Date,
  timeZone: string = PRAGUE,
): number {
  const [y, m, d] = target.split("-").map(Number);
  const targetDay = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return targetDay - dayNumberInZone(now, timeZone);
}

/**
 * Jednotka dnů česky: 1 den, 2–4 dny, 5+ dní.
 * Bez toho by na stránce svítilo „3 dní“.
 */
export function jednotkaDnu(count: number): string {
  if (count === 1) return "den";
  if (count >= 2 && count <= 4) return "dny";
  return "dní";
}

/**
 * Sloveso k počtu dní: „zbývá 1 den“, „zbýv**ají** 2 dny“, „zbývá 5 dní“.
 * Čeština mění u 2–4 i sloveso, ne jen jednotku.
 */
export function slovesoZbyva(count: number): string {
  return count >= 2 && count <= 4 ? "zbývají" : "zbývá";
}

/** Počet dní i s jednotkou, např. „88 dní“. */
export function dnyCesky(count: number): string {
  return `${count} ${jednotkaDnu(count)}`;
}

export type Odpocet =
  | {
      readonly state: "pred";
      readonly days: number;
      /** Jednotka pro `days` — „den“ / „dny“ / „dní“. */
      readonly unit: string;
      /** Sloveso — „zbývá“ / „zbývají“. */
      readonly verb: string;
      readonly text: string;
    }
  | { readonly state: "dnes" }
  | { readonly state: "po"; readonly days: number };

/** Stav odpočtu pro zobrazení. */
export function odpocet(now: Date, target: string = PIPI_VANOCE): Odpocet {
  const days = daysUntil(target, now);
  if (days === 0) return { state: "dnes" };
  if (days < 0) return { state: "po", days: -days };
  return {
    state: "pred",
    days,
    unit: jednotkaDnu(days),
    verb: slovesoZbyva(days),
    text: dnyCesky(days),
  };
}

/** Datum česky, např. „18. prosince 2026“. */
export function datumCesky(target: string = PIPI_VANOCE): string {
  const [y, m, d] = target.split("-").map(Number);
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
