import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, text, unique, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Pevný seznam lidí. Zadává ho organizátor v /admin a po prvním losu už se
 * nesmí měnit — jinak by se rozpadlo párování (někdo by zbyl bez dárce).
 */
export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /**
     * Osobní odkaz: `domena/jannovak`. Unikátní — dva lidé se stejným slugem
     * by si viděli navzájem do losů.
     */
    slug: text("slug").notNull(),
    /**
     * Skupina — pár nebo domácnost, jeden řádek v administraci. Uvnitř skupiny
     * se nedaruje. Jednotlivec má skupinu sám pro sebe; `notNull` proto, že
     * cizí klíče z `draws` s NULL nic nehlídají.
     */
    groupKey: text("group_key").notNull(),
    /** Pořadí v seznamu, jen pro stabilní zobrazení v UI. */
    sortOrder: integer("sort_order").notNull(),
    /** ISO string, ne `timestamp` — stejně jako v rideru, ať je to čitelné. */
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("participants_name_idx").on(t.name),
    uniqueIndex("participants_slug_idx").on(t.slug),
    // Cíl cizích klíčů z `draws` — viz `draws_not_same_group`.
    unique("participants_id_group").on(t.id, t.groupKey),
  ],
);

/**
 * Vylosované páry. Pravidla losování jsou vynucená schématem, ne jen kódem:
 *
 *   - `giverId` je primární klíč → každý daruje nejvýš jednou (jedno losování),
 *   - `receiverId` má unique index → každý dostane nejvýš jeden dárek,
 *   - `draws_not_self` → nikdo nedaruje sám sobě,
 *   - `draws_not_same_group` → nikdo nedaruje partnerovi ani nikomu z vlastní
 *     domácnosti. Skupiny se do losu opisují a cizí klíče (`draws_giver_group`,
 *     `draws_receiver_group`) hlídají, že opsané souhlasí se seznamem lidí —
 *     jinak by šla kontrola obejít zápisem vymyšlené skupiny.
 *
 * I kdyby logika losování měla chybu nebo se dva lidé trefili do stejné
 * milisekundy, databáze takový zápis odmítne. Tyhle podmínky se
 * neodstraňují — jsou poslední záchytná síť pod celou hrou.
 */
export const draws = pgTable(
  "draws",
  {
    giverId: text("giver_id").primaryKey(),
    receiverId: text("receiver_id").notNull(),
    giverGroup: text("giver_group").notNull(),
    receiverGroup: text("receiver_group").notNull(),
    drawnAt: text("drawn_at").notNull(),
  },
  (t) => [
    uniqueIndex("draws_receiver_idx").on(t.receiverId),
    index("draws_drawn_at_idx").on(t.drawnAt),
    // Bez tohohle omezení by „daruji sám sobě“ databáze klidně přijala —
    // hlídal by to jen aplikační kód. Ověřeno: dřív takový zápis prošel.
    check("draws_not_self", sql`${t.giverId} <> ${t.receiverId}`),
    check("draws_not_same_group", sql`${t.giverGroup} <> ${t.receiverGroup}`),
    foreignKey({
      name: "draws_giver_group",
      columns: [t.giverId, t.giverGroup],
      foreignColumns: [participants.id, participants.groupKey],
    }),
    foreignKey({
      name: "draws_receiver_group",
      columns: [t.receiverId, t.receiverGroup],
      foreignColumns: [participants.id, participants.groupKey],
    }),
  ],
);
