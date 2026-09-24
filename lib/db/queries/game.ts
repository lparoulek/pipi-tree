import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { draws, participants } from "@/lib/db/schema";
import { drawReceiver } from "@/lib/game/draw";
import { parseParticipantLines } from "@/lib/game/groups";
import { giftLetter } from "@/lib/game/letters";
import { randomInt } from "@/lib/game/random";
import { assignSlugs, toSlugFromUrl } from "@/lib/game/slug";

/**
 * Serverová pravidla hry. Veškeré losování se děje tady, uvnitř transakce —
 * v prohlížeči by se dalo odposlechnout, kdo už co má.
 *
 * Pozor na návratové hodnoty: podle bezpečnostních zásad Next.js pro server
 * actions se vrací jen to, co UI opravdu vykreslí. Proto tu nikde neuniká
 * počet zbývajících lidí ani cizí páry — uživatel se nesmí dozvědět, z kolika
 * jmen losoval, ani jak dopadli ostatní.
 *
 * Identita se určuje osobním odkazem (`slug`). Ten je odvozený ze jména, tedy
 * uhodnutelný — viz `lib/game/slug.ts`. Server proto nikdy nevrací nic, co by
 * z uhádnutého odkazu udělalo víc než přístup k jednomu losu.
 */

/**
 * Klíč advisory locku. Losování musí být sériové: dva lidé, kteří kliknou ve
 * stejný okamžik, by si jinak mohli vylosovat téhož člověka. Zámek je
 * *xact* (nikoli session), takže se pustí při commitu — jen tak funguje
 * s transaction poolerem Supabase.
 */
const DRAW_LOCK_KEY = 9137421;

export type Person = { id: string; name: string; slug: string };

export type Assignment = {
  /** Koho mám obdarovat. */
  readonly receiverName: string;
  /** Písmeno, na které má dárek začínat. */
  readonly letter: string;
};

export type DrawOutcome =
  | { status: "ok"; assignment: Assignment }
  /** Tohle jméno už losovalo. Vědomě neprozrazujeme koho si vytáhlo. */
  | { status: "already-drawn" }
  | { status: "unknown-person" }
  | { status: "not-ready" }
  /**
   * Nemělo by nastat — kontrola proveditelnosti v `drawReceiver` uváznutí
   * předchází. Kdyby se to přesto stalo, chceme hlasitou chybu a ne špatný los.
   */
  | { status: "stuck" };

/** Pevný seznam lidí, v pořadí pro UI. */
export async function listParticipants(): Promise<Person[]> {
  return db
    .select({ id: participants.id, name: participants.name, slug: participants.slug })
    .from(participants)
    .orderBy(participants.sortOrder);
}

/** Najde člověka podle jeho osobního odkazu (přesně). */
export async function getParticipantBySlug(slug: string): Promise<Person | null> {
  const rows = await db
    .select({ id: participants.id, name: participants.name, slug: participants.slug })
    .from(participants)
    .where(eq(participants.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Najde člověka, i když si odkaz někdo napsal po svém — `/Jan-Novák`,
 * `/JanNovak`, `/jan novak` vedou všechny na `/jannovak`. Přesný tvar si
 * nikdo nepamatuje a 404 je zbytečně krutá odpověď.
 *
 * Pozor na okrajový případ: když dvě různá jména vyjdou na stejný slug
 * („Jana Nováková“ i „Jan Anováková“ → `jananovakova`, `jananovakova2`),
 * normalizace vždy trefí ten první. Druhý člověk by tak přišel na cizí
 * stránku — ale ta ho zdraví jménem, takže si omylu všimne. Nové riziko to
 * není: slug je uhodnutelný tak jako tak (viz README).
 */
export async function findParticipantByLooseSlug(input: string): Promise<Person | null> {
  const exact = await getParticipantBySlug(input);
  if (exact) return exact;

  const normalized = toSlugFromUrl(input);
  if (!normalized || normalized === input) return null;

  return getParticipantBySlug(normalized);
}

/**
 * Jména všech účastníků pro animaci losování.
 *
 * Vrací **celý** seznam, ne jen zbývající lidi — v mlýnku se musí míhat
 * všichni, jinak by se z něj dalo vyčíst, kdo už losoval.
 */
export async function allNames(): Promise<string[]> {
  const rows = await db
    .select({ name: participants.name })
    .from(participants)
    .orderBy(participants.sortOrder);
  return rows.map((r) => r.name);
}

/**
 * Vylosuje pro daného člověka. Celé v jedné transakci pod zámkem, takže mezi
 * „co je ještě volné“ a zápisem se nikdo nevejde.
 */
export async function performDraw(giverId: string): Promise<DrawOutcome> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${DRAW_LOCK_KEY})`);

    const people = await tx
      .select({ id: participants.id, name: participants.name, groupKey: participants.groupKey })
      .from(participants)
      .orderBy(participants.sortOrder);
    const groupOf = new Map(people.map((p) => [p.id, p.groupKey]));


    // Pod dva lidi nemá derangement řešení (jeden by daroval sám sobě).
    if (people.length < 2) return { status: "not-ready" };
    if (!people.some((p) => p.id === giverId)) return { status: "unknown-person" };

    const existing = await tx
      .select({ giverId: draws.giverId, receiverId: draws.receiverId })
      .from(draws);

    if (existing.some((d) => d.giverId === giverId)) {
      return { status: "already-drawn" };
    }

    const drawnGivers = new Set(existing.map((d) => d.giverId));
    const takenReceivers = new Set(existing.map((d) => d.receiverId));

    const receiverId = drawReceiver(
      giverId,
      {
        remainingGivers: people.filter((p) => !drawnGivers.has(p.id)).map((p) => p.id),
        remainingReceivers: people.filter((p) => !takenReceivers.has(p.id)).map((p) => p.id),
        groupOf,
      },
      randomInt,
    );

    if (!receiverId) return { status: "stuck" };

    await tx.insert(draws).values({
      giverId,
      receiverId,
      // Opsané skupiny hlídá databáze (`draws_not_same_group` + cizí klíče).
      giverGroup: groupOf.get(giverId)!,
      receiverGroup: groupOf.get(receiverId)!,
      drawnAt: new Date().toISOString(),
    });

    const receiver = people.find((p) => p.id === receiverId);
    if (!receiver) return { status: "stuck" };

    return {
      status: "ok",
      assignment: { receiverName: receiver.name, letter: giftLetter(receiver.name) },
    };
  });
}

/**
 * Přečte už vylosovaný pár. Volat **jen** s ID z podepsané cookie — jinak by
 * si kdokoli přečetl cizí los zadáním cizího ID.
 */
export async function getAssignment(giverId: string): Promise<Assignment | null> {
  const rows = await db
    .select({ name: participants.name })
    .from(draws)
    .innerJoin(participants, eq(participants.id, draws.receiverId))
    .where(eq(draws.giverId, giverId))
    .limit(1);

  const receiver = rows[0];
  if (!receiver) return null;

  return { receiverName: receiver.name, letter: giftLetter(receiver.name) };
}

/** Začalo se už losovat? Pak se seznam lidí nesmí měnit. */
export async function hasAnyDraw(): Promise<boolean> {
  const rows = await db.select({ giverId: draws.giverId }).from(draws).limit(1);
  return rows.length > 0;
}

/**
 * Přehled pro organizátora: **jen počty**, žádné páry. Ani admin se nemá
 * dozvědět, kdo koho má — jinak by o překvapení přišel taky.
 */
export async function progress(): Promise<{ total: number; drawn: number }> {
  const [people, done] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(participants),
    db.select({ n: sql<number>`count(*)::int` }).from(draws),
  ]);
  return { total: people[0]?.n ?? 0, drawn: done[0]?.n ?? 0 };
}

/**
 * Seznam lidí po skupinách (pár, domácnost), v pořadí zadání. Pro
 * administraci — ta ho vrací do textového pole jako řádky s „+“.
 */
export async function listGroups(): Promise<string[][]> {
  const rows = await db
    .select({ name: participants.name, groupKey: participants.groupKey })
    .from(participants)
    .orderBy(participants.sortOrder);

  const byGroup = new Map<string, string[]>();
  for (const { name, groupKey } of rows) {
    byGroup.set(groupKey, [...(byGroup.get(groupKey) ?? []), name]);
  }
  return [...byGroup.values()];
}

/**
 * Nahradí seznam lidí. Jen dokud se nezačalo losovat — pak by se párování
 * rozsypalo.
 *
 * Vstup jsou řádky z administrace: řádek = skupina, jména v ní oddělená „+“
 * (viz `lib/game/groups.ts`). Seznam, který nejde rozlosovat, se neuloží.
 */
export async function replaceParticipants(
  lines: readonly string[],
): Promise<{ ok: boolean; detail: string }> {
  const parsed = parseParticipantLines(lines);
  if (!parsed.ok) return parsed;
  const { groups } = parsed;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${DRAW_LOCK_KEY})`);

    const started = await tx.select({ giverId: draws.giverId }).from(draws).limit(1);
    if (started.length > 0) {
      return {
        ok: false,
        detail: "Už se losuje — seznam se měnit nedá. Nejdřív losování resetuj.",
      };
    }

    const people = groups.flatMap((group) => {
      const groupKey = randomUUID();
      return group.map((name) => ({ name, groupKey }));
    });
    const slugs = assignSlugs(people.map((p) => p.name));

    await tx.delete(participants);
    const now = new Date().toISOString();
    await tx.insert(participants).values(
      people.map(({ name, groupKey }, i) => ({
        id: randomUUID(),
        name,
        slug: slugs[i].slug,
        groupKey,
        sortOrder: i,
        createdAt: now,
      })),
    );

    const skupiny = groups.filter((g) => g.length > 1);
    return {
      ok: true,
      detail:
        `Seznam uložen — ${people.length} lidí.` +
        (skupiny.length > 0
          ? ` Navzájem se nevylosují: ${skupiny.map((g) => g.join(" + ")).join(", ")}.`
          : ""),
    };
  });
}

/** Smaže všechny losy (seznam lidí zůstane). Losuje se znova od nuly. */
export async function resetDraws(): Promise<void> {
  await db.delete(draws);
}
