import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Připojení k Supabase Postgresu. Stejný vzorec jako v rideru, včetně
 * bolestně nabytých pravidel:
 *
 *   - Inicializace je líná, aby `next build` nepadal, když není DATABASE_URL.
 *   - **Session pooler (port 5432), ne transaction pooler (6543).** postgres.js
 *     posílá souběžné dotazy jedním spojením za sebou bez čekání (pipelining)
 *     a transaction pooler (Supavisor) na tom natrvalo zamrzne — stačí
 *     `Promise.all` tří dotazů na už použitém spojení. Ověřeno: 6543 visí,
 *     5432 projde i `npm run kontrola`. V administraci se to projevilo tak,
 *     že po resetu stránka donekonečna načítala.
 *   - `prepare: false` zůstává, aby šlo kdykoli přejít na pooler bez
 *     prepared statements.
 *   - Malý pool, protože serverless funkce se množí a pooler má limit spojení.
 */

const POOL_SIZE = 3;

let cached: PostgresJsDatabase<typeof schema> | null = null;

function connect(): PostgresJsDatabase<typeof schema> {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Chybí DATABASE_URL. Zkopíruj .env.local.example do .env.local a doplň připojení k Supabase.",
    );
  }

  if (isTransactionPooler(url)) {
    // Radši hned hlasitá chyba než stránky, které donekonečna načítají.
    throw new TransactionPoolerError();
  }

  const client = postgres(url, { prepare: false, max: POOL_SIZE, idle_timeout: 20 });
  cached = drizzle(client, { schema });
  return cached;
}

/** Supabase transaction pooler — na něm postgres.js zamrzá, viz výše. */
function isTransactionPooler(url: string): boolean {
  try {
    const { hostname, port } = new URL(url);
    return hostname.endsWith(".pooler.supabase.com") && port === "6543";
  } catch {
    return false; // Neplatnou adresu nechme ohlásit samotný postgres.js.
  }
}

export class TransactionPoolerError extends Error {
  readonly code = "TRANSACTION_POOLER";
  constructor() {
    super(
      "DATABASE_URL míří na Supabase transaction pooler (port 6543), na kterém aplikace zamrzá. " +
        "Použij session pooler: stejná adresa s portem 5432.",
    );
  }
}

/** Proxy, aby se spojení otevřelo teprve při prvním skutečném dotazu. */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(connect(), prop, receiver);
  },
});

/** Je databáze vůbec nakonfigurovaná? Pro /admin a health check. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
