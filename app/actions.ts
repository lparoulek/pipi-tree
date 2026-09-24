"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import {
  getParticipantBySlug,
  performDraw,
  replaceParticipants,
  resetDraws,
  type Assignment,
} from "@/lib/db/queries/game";

/**
 * Server actions. Podle dokumentace Next.js je každá action veřejný POST
 * endpoint, takže se tu drží tři pravidla:
 *
 *   1. Vstup se validuje (zod) — přijde z prohlížeče, tedy nedůvěryhodně.
 *   2. Identita je osobní odkaz (`slug`), ověřený proti databázi.
 *   3. Vrací se jen to, co UI vykreslí — žádné počty, žádné cizí páry.
 */

/** Slug je vždy jen malá písmena a číslice, viz `lib/game/slug.ts`. */
const slugSchema = z.string().regex(/^[a-z0-9]{1,40}$/);

export type DrawResult =
  | { status: "ok"; assignment: Assignment }
  | { status: "already-drawn" }
  | { status: "unknown-person" }
  | { status: "not-ready" }
  | { status: "stuck" }
  | { status: "error"; detail: string };

/**
 * Vylosuje pro člověka, kterému patří tenhle osobní odkaz.
 *
 * Slug chodí od klienta, ale to je v pořádku — je to jeho identita a ověřuje
 * se proti databázi. Odkaz je odvozený ze jména, tedy uhodnutelný; je to
 * vědomá volba ve prospěch jednoduchosti (viz README).
 */
export async function drawAction(slug: string): Promise<DrawResult> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { status: "unknown-person" };

  try {
    const person = await getParticipantBySlug(parsed.data);
    if (!person) return { status: "unknown-person" };

    return await performDraw(person.id);
  } catch (error) {
    console.error("[draw] selhalo losování", error);
    return {
      status: "error",
      detail: "Něco se pokazilo. Zkus to prosím ještě jednou.",
    };
  }
}

/* --- Admin ---------------------------------------------------------------- */

const namesSchema = z.string().max(4000);

/** Stav admin formulářů — tvar odpovídá `useActionState`. */
export type AdminState = { ok: boolean; detail: string } | null;

export async function saveParticipantsAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { ok: false, detail: "Nemáš oprávnění." };

  const raw = namesSchema.safeParse(formData.get("names"));
  if (!raw.success) return { ok: false, detail: "Seznam je moc dlouhý." };

  try {
    const result = await replaceParticipants(raw.data.split("\n"));
    // Bez tohohle by administrace dál ukazovala seznam z doby před uložením
    // a formulář by se po odeslání vyprázdnil. `drawAction` to schválně nedělá:
    // přerender po losu by zabil animaci mlýnku.
    if (result.ok) refresh();
    return result;
  } catch (error) {
    console.error("[admin] uložení seznamu selhalo", error);
    return { ok: false, detail: "Uložení selhalo — zkontroluj připojení k databázi." };
  }
}

export async function resetDrawsAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await isAdmin())) return { ok: false, detail: "Nemáš oprávnění." };

  // Reset zahodí všechny losy, takže chceme vědomé potvrzení, ne překliknutí.
  if (formData.get("confirm") !== "RESET") {
    return { ok: false, detail: "Pro reset napiš do políčka RESET." };
  }

  try {
    await resetDraws();
    refresh();
    return { ok: true, detail: "Všechny losy smazány. Můžete losovat znovu." };
  } catch (error) {
    console.error("[admin] reset selhal", error);
    return { ok: false, detail: "Reset selhal — zkontroluj připojení k databázi." };
  }
}
