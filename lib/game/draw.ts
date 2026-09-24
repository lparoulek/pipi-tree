/**
 * Čistá logika losování — žádné I/O, žádná databáze. Díky tomu je celá
 * testovatelná (viz `tests/game/draw.test.ts`), což u téhle části potřebujeme:
 * chyba tady se projeví až u posledního losujícího na Štědrý den.
 *
 * Model: každý daruje právě jednou a každý dostane právě jeden dárek, takže
 * přiřazení je *permutace bez pevného bodu* (derangement) — nikdo nedaruje
 * sám sobě. Navíc se nedaruje uvnitř skupiny (pár, domácnost).
 */

/** Losuje se postupně, takže pořád existují dvě různé zbývající množiny. */
export type DrawState = {
  /** Kdo ještě nelosoval. */
  readonly remainingGivers: readonly string[];
  /** Koho ještě nikdo nevylosoval. */
  readonly remainingReceivers: readonly string[];
  /**
   * Skupina každého člověka — pár nebo domácnost. Uvnitř vlastní skupiny se
   * nedaruje. Kdo v mapě chybí (nebo mapa celá), omezený je jen tím, že
   * nedaruje sám sobě.
   */
  readonly groupOf?: ReadonlyMap<string, string>;
};

/** Smí `giver` obdarovat `receiver`? Ne sebe a ne nikoho z vlastní skupiny. */
export function mayGive(
  giver: string,
  receiver: string,
  groupOf?: ReadonlyMap<string, string>,
): boolean {
  if (giver === receiver) return false;
  const group = groupOf?.get(giver);
  return group === undefined || group !== groupOf?.get(receiver);
}

/**
 * Dá se zbytek losování ještě dokončit — tedy přiřadit každému zbývajícímu
 * dárci jiného zbývajícího příjemce, kterého smí obdarovat?
 *
 * Dřív tu byl jednoduchý vzorec z Hallovy podmínky, jenže ten platil jen pro
 * pravidlo „ne sám sobě“. S páry už neplatí: náhodné losování může dojet do
 * stavu, kdy poslednímu zbyde jen jeho partner. Proto se párování opravdu
 * hledá (Kuhnův algoritmus s rozšiřujícími cestami). Pro desítky lidí je to
 * zlomek milisekundy.
 */
export function canStillFinish(
  givers: readonly string[],
  receivers: readonly string[],
  groupOf?: ReadonlyMap<string, string>,
): boolean {
  if (givers.length !== receivers.length) return false;

  /** Příjemce → dárce, kterému je zatím přidělený. */
  const owner = new Map<string, string>();

  const assign = (giver: string, seen: Set<string>): boolean => {
    for (const receiver of receivers) {
      if (seen.has(receiver) || !mayGive(giver, receiver, groupOf)) continue;
      seen.add(receiver);
      const current = owner.get(receiver);
      // Volný příjemce, nebo se jeho dosavadní dárce dá přesunout jinam.
      if (current === undefined || assign(current, seen)) {
        owner.set(receiver, giver);
        return true;
      }
    }
    return false;
  };

  return givers.every((giver) => assign(giver, new Set()));
}

/**
 * Koho si smí `giver` vylosovat, aby hra zůstala dokončitelná.
 *
 * Nejde jen o „kohokoli kromě sebe a partnera“: kdyby si vzal špatného,
 * poslednímu losujícímu by zbylo jen jeho vlastní jméno nebo jeho partner
 * a losování by uvázlo. Proto se každý kandidát zkusí „nasucho“ přiřadit
 * a ověří se, že zbytek jde dokončit.
 */
export function eligibleReceivers(
  giver: string,
  state: DrawState,
): string[] {
  const { remainingGivers, remainingReceivers, groupOf } = state;
  const giversAfter = remainingGivers.filter((g) => g !== giver);

  return remainingReceivers.filter(
    (r) =>
      mayGive(giver, r, groupOf) &&
      canStillFinish(
        giversAfter,
        remainingReceivers.filter((x) => x !== r),
        groupOf,
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
