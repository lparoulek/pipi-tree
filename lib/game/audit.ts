import { canStillFinish, mayGive } from "@/lib/game/draw";

/**
 * Zpětná kontrola losování pro organizátora — ověří, že losy dávají smysl,
 * a přitom **neprozradí nic** o tom, kdo koho má. Výsledek jsou jen popisky
 * a ano/ne, žádná jména ani počty chyb u konkrétních lidí.
 *
 * Kontroluje se nezávisle na tom, jak se losovalo: bere se, co je opravdu
 * v databázi, a skupiny ze seznamu lidí (ne ty opsané do losu). Kdyby se
 * cokoli rozbilo v kódu i ve schématu naráz, tady se to ukáže.
 */

export type AuditPerson = { readonly id: string; readonly groupKey: string };
export type AuditDraw = { readonly giverId: string; readonly receiverId: string };

export type AuditCheck = { readonly label: string; readonly ok: boolean };

export type Audit = {
  /** Vylosovali už všichni? */
  readonly complete: boolean;
  readonly checks: readonly AuditCheck[];
};

export function auditDraws(
  people: readonly AuditPerson[],
  draws: readonly AuditDraw[],
): Audit {
  const ids = new Set(people.map((p) => p.id));
  const groupOf = new Map(people.map((p) => [p.id, p.groupKey]));
  const givers = draws.map((d) => d.giverId);
  const receivers = draws.map((d) => d.receiverId);

  const known = draws.every((d) => ids.has(d.giverId) && ids.has(d.receiverId));
  const complete =
    people.length > 0 && known && new Set(givers).size === people.length && draws.length === people.length;

  const checks: AuditCheck[] = [
    { label: "Každý los patří lidem ze seznamu", ok: known },
    { label: "Nikdo nelosoval dvakrát", ok: new Set(givers).size === givers.length },
    { label: "Nikdo nedostal dva dárky", ok: new Set(receivers).size === receivers.length },
    { label: "Nikdo si nevylosoval sám sebe", ok: draws.every((d) => d.giverId !== d.receiverId) },
    {
      label: "Nikdo si nevylosoval partnera ani nikoho z domácnosti",
      ok: draws.every((d) => mayGive(d.giverId, d.receiverId, groupOf)),
    },
  ];

  if (complete) {
    checks.push({
      label: "Všichni vylosovali a každý dostane právě jeden dárek",
      ok: receivers.every((r) => ids.has(r)) && new Set(receivers).size === people.length,
    });
  } else {
    // Rozehrané losování: jde zbytek ještě dokončit? Stejný výpočet, jakým se
    // hlídá každý los — tady ale nad tím, co v databázi opravdu je.
    const drawn = new Set(givers);
    const taken = new Set(receivers);
    checks.push({
      label: "Zbytek losování jde dokončit",
      ok:
        known &&
        canStillFinish(
          people.filter((p) => !drawn.has(p.id)).map((p) => p.id),
          people.filter((p) => !taken.has(p.id)).map((p) => p.id),
          groupOf,
        ),
    });
  }

  return { complete, checks };
}
