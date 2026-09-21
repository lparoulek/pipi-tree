import { sql } from "drizzle-orm";
import { check, index, pgTable, text, integer, uniqueIndex } from "drizzle-orm/pg-core";

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
    /** Pořadí v seznamu, jen pro stabilní zobrazení v UI. */
    sortOrder: integer("sort_order").notNull(),
    /** ISO string, ne `timestamp` — stejně jako v rideru, ať je to čitelné. */
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("participants_name_idx").on(t.name),
    uniqueIndex("participants_slug_idx").on(t.slug),
  ],
);

/**
 * Vylosované páry. Obě pravidla hry jsou vynucená schématem, ne jen kódem:
 *
 *   - `giverId` je primární klíč → každý daruje nejvýš jednou (jedno losování),
 *   - `receiverId` má unique index → každý dostane nejvýš jeden dárek,
 *   - `draws_not_self` → nikdo nedaruje sám sobě.
 *
 * I kdyby logika losování měla chybu nebo se dva lidé trefili do stejné
 * milisekundy, databáze takový zápis odmítne. Tyhle tři podmínky se
 * neodstraňují — jsou poslední záchytná síť pod celou hrou.
 */
export const draws = pgTable(
  "draws",
  {
    giverId: text("giver_id").primaryKey(),
    receiverId: text("receiver_id").notNull(),
    drawnAt: text("drawn_at").notNull(),
  },
  (t) => [
    uniqueIndex("draws_receiver_idx").on(t.receiverId),
    index("draws_drawn_at_idx").on(t.drawnAt),
    // Bez tohohle omezení by „daruji sám sobě“ databáze klidně přijala —
    // hlídal by to jen aplikační kód. Ověřeno: dřív takový zápis prošel.
    check("draws_not_self", sql`${t.giverId} <> ${t.receiverId}`),
  ],
);
