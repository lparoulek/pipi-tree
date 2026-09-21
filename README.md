# Pipi Tree 🎄

Vánoční losování dárků. Každý si na jedné adrese klikne na své jméno, jednou
zalosuje a dozví se jednoho člověka, kterého obdaruje — a nic víc. Dárek musí
začínat na stejné písmeno jako jméno obdarovaného.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
Drizzle ORM + Postgres (Supabase) · Vercel

## Jak se hraje

1. Organizátor zadá v `/admin` seznam lidí — **jméno i příjmení**, protože
   v losu se zobrazí přesně to, co zadá.
2. Všichni si otevřou **jednu adresu** — každý u sebe doma, na svém telefonu.
   Je na ní odpočet do oslavy a seznam jmen: každý klikne na sebe a potvrdí,
   že je to opravdu on.
3. Pak zmáčkne *Losovat!* a uvidí jedno jméno a písmeno, na které má dárek
   začínat.

Název události, datum a cena dárku jsou pohromadě v konstantách v
[`lib/game/countdown.ts`](lib/game/countdown.ts) — na další rok se mění
jen tam.

Kdo chce, může místo toho použít **osobní odkaz** („Jan Novák“ → `/jannovak`);
`/admin` je vygeneruje k rozeslání. Na přesný tvar si vzpomínat nemusí —
`/Jan-Novák`, `/JanNovak` i `/jan_novak` skončí přesměrováním na `/jannovak`.
Odkaz zůstává platný, takže se k losu dá vrátit kdykoli a odkudkoli.

## Co hra garantuje

Každý daruje i dostane právě jednou, nikdo nedaruje sám sobě a losování nikdy
neuvázne — ani když všichni zmáčknou *Losovat!* ve stejný okamžik. Losuje se
v transakci pod advisory lockem, takže dva lidé nemohou dostat téhož
obdarovaného, a kdyby logika selhala, odmítne to databáze.

Nikdo se nedozví, z kolika lidí losoval ani jak dopadli ostatní — páry se
nezobrazují ani v administraci. Animace je pro všechny stejně dlouhá, i pro
posledního, kterému už zbývá jediná možnost.

Přeověřit to jde kdykoli: `npm run kontrola -- --force`. Podrobnosti a pravidla
pro úpravy jsou v [AGENTS.md](AGENTS.md).

## Příkazy

| Příkaz | Co dělá |
| --- | --- |
| `npm run dev` | vývojový server na <http://localhost:3000> |
| `npm run build` / `npm start` | produkční build / jeho spuštění |
| `npm test` | testy losovací logiky (Vitest) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm run db:push` | vytvoří tabulky podle `lib/db/schema.ts` |
| `npm run seed` | naplní testovací jména ([`scripts/seed.ts`](scripts/seed.ts)) |
| `npm run stav` | vypíše jména, odkazy a kolik lidí už losovalo |
| `npm run kontrola -- --force` | prověří koncovku a souběh proti databázi (destruktivní) |

## Rozjezd lokálně

```bash
# 1. Databáze — buď Supabase, nebo Postgres v Dockeru:
docker run -d --name pipi-tree-pg \
  -e POSTGRES_PASSWORD=pipi -e POSTGRES_DB=pipitree \
  -p 55432:5432 postgres:16-alpine

# 2. Konfigurace — doplň DATABASE_URL a ADMIN_PASSWORD
cp .env.local.example .env.local

# 3. Tabulky, testovací data, start
npm install
npm run db:push
npm run seed
npm run dev
```

Administrace je na <http://localhost:3000/admin> (uživatel libovolný, heslo
`ADMIN_PASSWORD`). Až databázi nebudeš potřebovat: `docker rm -f pipi-tree-pg`.

## Kde se co ukládá

Všechno v Postgresu, **v prohlížeči nic** — žádné localStorage ani cookies.
Los tak nezmizí smazáním dat prohlížeče; kdo má odkaz, dostane ho ze serveru.

- `participants` — seznam lidí a jejich odkazy (`name`, `slug`, …)
- `draws` — vylosované páry. Pravidla hry vynucuje i databáze, ne jen kód:
  `giver_id` je primární klíč (daruje se jednou), `receiver_id` má unique index
  (dostane se jednou) a omezení `draws_not_self` zakáže darovat sám sobě.

Schéma je v [`lib/db/schema.ts`](lib/db/schema.ts). Lokálně běží Postgres
v Dockeru na portu `55432`, v produkci Supabase přes `DATABASE_URL`.

## Nasazení na Vercel

1. Naimportuj repozitář ve Vercelu.
2. V **Settings → Environment Variables** (scope Production) nastav:
   - `DATABASE_URL` — Supabase **transaction pooler**, port `6543`
   - `DIRECT_URL` — session connection, port `5432` (jen pro `db:push`)
   - `ADMIN_PASSWORD` — heslo do `/admin`
3. Push do `main` = produkční deploy. `npm run db:push` se pouští z lokálu.

Po deployi musí `GET /api/health` vrátit `{"ok":true}`.

> `prepare: false` v `lib/db/client.ts` je u transaction pooleru **povinné** —
> pooler nepodporuje prepared statements.

## Poznámka k tajnosti

Aplikace nemá přihlašování: kdo klikne na cizí jméno (nebo uhádne cizí odkaz —
je odvozený ze jména, takže `/petrsvoboda` je snadné), dostane se k cizímu
losu. Vědomá volba ve prospěch jednoduchosti; hra je pro jednu domácnost, kde
se lidi znají. Proti překliknutí je aspoň potvrzovací krok.

Kdyby to nestačilo, přidej v [`lib/game/slug.ts`](lib/game/slug.ts) ke slugu
náhodnou příponu a rozesílej jen osobní odkazy — zbytek aplikace se měnit
nemusí.

Co hra nedovolí ani tak: zjistit, kolik lidí ještě zbývá, přečíst si los
někoho, kdo už losoval, ani losovat dvakrát.

## Architektura

```
app/
  page.tsx            odpočet do oslavy + výběr jména ze seznamu
  [slug]/page.tsx     osobní stránka: zalosovat / připomenout si los
  [slug]/loading.tsx  okamžitá odezva, než se stránka načte
  actions.ts          server actions: losování, admin
  admin/page.tsx      seznam lidí, osobní odkazy, stav hry, reset
  api/health/route.ts health check
  not-found.tsx       česká 404
  globals.css         designové tokeny (@theme), tlačítka, animace
components/
  VyberJmena.tsx      výběr jména ze seznamu + potvrzení proti překliknutí
  PersonalDraw.tsx    hra na klientovi — losovat, válec, odhalení
  DrawReel.tsx        výherní válec se jmény
  Backdrop.tsx        fotka na pozadí, ztmavení, sněžení
  CandyButton.tsx / Confetti.tsx / Snow.tsx
lib/
  game/draw.ts        čistá logika losování (derangement + dokončitelnost)
  game/letters.ts     první písmeno jména česky (diakritika, „Ch“)
  game/slug.ts        osobní odkaz ze jména + tolerance k zápisu
  game/countdown.ts   fakta o události (název, datum, cena) + odpočet
  game/random.ts      kryptografická náhoda
  db/schema.ts        participants, draws
  db/queries/game.ts  serverová pravidla hry (transakce + advisory lock)
  admin.ts            kontrola admin hesla
proxy.ts              brána pro /admin
scripts/              seed.ts, stav.ts, kontrola.ts
tests/game/           testy logiky, písmen, odkazů a odpočtu
```
