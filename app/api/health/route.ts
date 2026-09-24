import { sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/lib/db/client";

/** Jednoduchý health check — jede databáze? Užitečné po deployi. */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, detail: "chybí DATABASE_URL" }, { status: 503 });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[health] databáze neodpovídá", error);
    // Jen kód chyby (`28P01`, `ENOTFOUND`, `ERR_INVALID_URL`…), ne zprávu —
    // ta může obsahovat adresu serveru. Kód stačí, aby se po deployi dalo
    // poznat, co je špatně, bez lovení v logu Vercelu.
    return Response.json(
      { ok: false, detail: "databáze neodpovídá", kod: kodChyby(error) },
      { status: 503 },
    );
  }
}

/**
 * Drizzle chyby databáze balí do obecného `Error` („Failed query…“) a pravý
 * kód je až v `cause` — proto se jde řetězem dolů k prvnímu `code`.
 */
function kodChyby(error: unknown): string {
  for (let e = error, hloubka = 0; e instanceof Error && hloubka < 5; e = e.cause, hloubka++) {
    const code = (e as Error & { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return error instanceof Error ? error.name : "neznámá";
}
