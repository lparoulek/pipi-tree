/**
 * Čistá logika losování — žádné I/O, žádná databáze. Díky tomu je celá
 * testovatelná (viz `tests/game/draw.test.ts`), což u téhle části potřebujeme:
 * chyba tady se projeví až u posledního losujícího na Štědrý den.
 *
 * Model: každý daruje právě jednou a každý dostane právě jeden dárek, takže
 * přiřazení je *permutace bez pevného bodu* (derangement) — nikdo nedaruje
 * sám sobě.
 */

/** Losuje se postupně, takže pořád existují dvě různé zbývající množiny. */
export type DrawState = {
  /** Kdo ještě nelosoval. */
  readonly remainingGivers: readonly string[];
  /** Koho ještě nikdo nevylosoval. */
  readonly remainingReceivers: readonly string[];
};

/**
 * Dá se zbytek hry ještě dokončit?
 *
 * Graf možností je „každý dárce ke každému příjemci kromě sebe“. Z Hallovy
 * podmínky vyjde, že úplné párování existuje vždy, s jedinou výjimkou: zbývá
 * jediný dárce a jediný příjemce a je to tentýž člověk.
 *
 * Pro |S| >= 2 totiž okolí N(S) pokrývá celou množinu příjemců (ke každému
 * příjemci se najde dárce, který to není on sám), takže |N(S)| = n >= |S|.
 * Pro |S| = 1 je |N(S)| = n - 1, pokud je ten dárce i mezi příjemci — a to je
 * < 1 právě když n = 1.
 */
export function canStillFinish(
  givers: readonly string[],
  receivers: readonly string[],
): boolean {
  if (givers.length !== receivers.length) return false;
  if (givers.length === 1) return givers[0] !== receivers[0];
  return true;
}

/**
 * Koho si smí `giver` vylosovat, aby hra zůstala dokončitelná.
 *
 * Nejde jen o „kohokoli kromě sebe“: kdyby si vzal špatného, poslednímu
 * losujícímu by zbylo jen jeho vlastní jméno a hra by uvázla. Proto se každý
 * kandidát zkusí „nasucho“ přiřadit a ověří se, že zbytek jde dokončit.
 */
export function eligibleReceivers(
  giver: string,
  state: DrawState,
): string[] {
  const { remainingGivers, remainingReceivers } = state;
  const giversAfter = remainingGivers.filter((g) => g !== giver);

  return remainingReceivers.filter(
    (r) =>
      r !== giver &&
      canStillFinish(
        giversAfter,
        remainingReceivers.filter((x) => x !== r),
      ),
  );
}

/**
 * Vylosuje jednoho příjemce pro `giver`. Náhoda se vstřikuje zvenčí
 * (`randomInt(n)` vrací 0..n-1), takže testy můžou být deterministické a
 * v produkci se použije kryptografická náhoda místo `Math.random`.
 *
 * Vrací `null`, když dárce losovat nemůže — buď už nelosuje, nebo mu nic
 * nezbylo. Volající to musí ošetřit, proto null a ne výjimka.
 */
export function drawReceiver(
  giver: string,
  state: DrawState,
  randomInt: (exclusiveMax: number) => number,
): string | null {
  if (!state.remainingGivers.includes(giver)) return null;

  const options = eligibleReceivers(giver, state);
  if (options.length === 0) return null;

  return options[randomInt(options.length)] ?? null;
}
