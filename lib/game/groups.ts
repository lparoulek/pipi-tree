import { canStillFinish } from "@/lib/game/draw";

/**
 * Seznam lidí z administrace: jeden řádek = jedna skupina. Pár nebo
 * domácnost se píše na jeden řádek a jména se oddělují „+“:
 *
 *     Lukáš Paroulek + Tereza Paroulková
 *     Filip Dyrčík
 *
 * Uvnitř skupiny se nedaruje. Bez I/O, plně testované
 * (`tests/game/groups.test.ts`).
 */

export type ParsedList =
  | { ok: true; groups: string[][] }
  | { ok: false; detail: string };

const normalize = (name: string) => name.trim().replace(/\s+/g, " ");

export function parseParticipantLines(lines: readonly string[]): ParsedList {
  const groups = lines
    .map((line) => line.split("+").map(normalize).filter((n) => n.length > 0))
    .filter((group) => group.length > 0);

  // Duplicita se neslučuje potichu: u „Jana + Petr“ a „Jana“ není jasné,
  // jestli Jana je v páru, nebo ne — a to rozhoduje o tom, koho smí losovat.
  const seen = new Set<string>();
  for (const name of groups.flat()) {
    const key = name.toLocaleLowerCase("cs-CZ");
    if (seen.has(key)) return { ok: false, detail: `„${name}“ je v seznamu dvakrát.` };
    seen.add(key);
  }

  const total = seen.size;
  if (total < 2) {
    return { ok: false, detail: "Potřebuju aspoň dva lidi, jinak není co losovat." };
  }

  // Rozlosovat jde, právě když žádná skupina nemá víc než polovinu lidí —
  // její členové potřebují stejně tolik obdarovaných mimo ni. Pravdu ale
  // říká `canStillFinish` (tentýž výpočet jako při losu), vzorec je jen
  // pro srozumitelnou hlášku.
  const people = groups.flat();
  const groupOf = new Map(groups.flatMap((g, i) => g.map((name) => [name, String(i)] as const)));
  if (!canStillFinish(people, people, groupOf)) {
    const biggest = groups.reduce((a, b) => (b.length > a.length ? b : a));
    return {
      ok: false,
      detail:
        `Takhle to rozlosovat nejde: „${biggest.join(" + ")}“ je víc než polovina všech lidí, ` +
        "takže by pro ně nezbylo dost lidí mimo ně. Přidej další lidi, nebo skupinu rozděl.",
    };
  }

  return { ok: true, groups };
}

/** Zpátky na řádky pro textové pole v administraci. */
export function formatParticipantLines(groups: readonly (readonly string[])[]): string[] {
  return groups.map((g) => g.join(" + "));
}
