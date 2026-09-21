import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Připojení k Supabase Postgresu. Stejný vzorec jako v rideru, včetně
 * bolestně nabytých pravidel:
 *
 *   - Inicializace je líná, aby `next build` nepadal, když není DATABASE_URL.
 *   - `prepare: false` je u Supabase transaction pooleru (port 6543) povinné —
 *     pooler prepared statements nepodporuje.
 *   - Malý pool, protože serverless funkce se množí a pooler má limit.
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

  const client = postgres(url, { prepare: false, max: POOL_SIZE, idle_timeout: 20 });
  cached = drizzle(client, { schema });
  return cached;
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
