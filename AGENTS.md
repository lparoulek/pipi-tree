<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pipi Tree — pravidla projektu

## O čem to je

Vánoční losování dárků. Pevný seznam lidí, každý si jednou vylosuje jednoho
člověka, kterého obdaruje. Přiřazení je **permutace bez pevného bodu**
(derangement): každý daruje právě jednou, každý dostane právě jeden dárek,
nikdo nedaruje sám sobě. Dárek musí začínat na stejné písmeno jako jméno
obdarovaného.

## Nedotknutelná pravidla

1. **Tajnost je vlastnost, ne detail.** Uživatel nesmí zjistit, z kolika lidí
   losuje, kdo už losoval, ani jak dopadl kdokoli jiný. Do UI se proto nikdy
   nepřidává „zbývá N lidí“ ani výpis párů — ani v administraci.

   Seznam jmen na hlavní stránce **je** vidět, a to schválně: je to hlavní
   cesta do hry, protože ne každý si poradí se zadáním adresy. U jmen se ale
   nikdy nevyznačuje, kdo už losoval — tím by se prozradil stav hry.
2. **Losování patří na server.** Veškerá logika je v `lib/db/queries/game.ts`,
   uvnitř transakce s advisory lockem. V prohlížeči se o zbývajících lidech
   nesmí objevit nic.
3. **Server actions vracejí jen to, co UI vykreslí.** Žádné počty, žádné cizí
   páry, žádné surové řádky z databáze.
4. **Identita losujícího je jeho osobní odkaz** (`slug`, viz
   `lib/game/slug.ts`), ověřený proti databázi. Slug je odvozený ze jména,
   tedy **uhodnutelný** — vědomá volba ve prospěch jednoduchosti. Server proto
   nikdy nevrací nic, co by z uhádnutého odkazu udělalo víc než přístup
   k jednomu losu. Kdyby bylo potřeba to utáhnout, přidá se ke slugu náhodná
   přípona a zbytek aplikace zůstane.
5. **Seznam lidí se po prvním losu nemění.** Jinak by se párování rozpadlo.
   Vynucuje `replaceParticipants`.
6. **Pravidla hry hlídá i schéma databáze**, ne jen kód: `draws.giver_id` je
   primární klíč (daruje se jednou), `draws.receiver_id` má unique index
   (dostane se jednou) a omezení `draws_not_self` zakáže darovat sám sobě.
   Tohle se neodstraňuje — je to poslední záchytná síť. Ověřeno vynucením
   duplikátů přímo v SQL; to třetí omezení dřív chybělo a „daruji sám sobě“
   databáze klidně přijala.
7. **Losování je sériové.** Běží v transakci pod `pg_advisory_xact_lock`, takže
   souběžní losující si nemohou vzít téhož obdarovaného. Zámek musí zůstat
   *xact* (nikoli session) — jinak nefunguje s transaction poolerem Supabase.
8. **Animace losování je pro všechny stejná.** I poslední člověk, kterému zbývá
   jediná možnost, vidí celý mlýnek se všemi jmény a stejně dlouhý. Válec
   nesmí točit jen zbývající lidi — z toho by se dal odhadnout stav hry.

## Ověřování

Souběh a koncovku prověří `npm run kontrola -- --force` (destruktivní, jen na
testovací databázi). Čistou logiku losování pokrývá `npm test`, včetně
porovnání s hrubou silou a simulace celých her.

## Kde co je

- `lib/game/draw.ts` — čistá logika losování včetně kontroly, že hra zůstane
  dokončitelná. Bez I/O, plně testovaná. **Tady se nesahá na nic bez testu.**
- `lib/game/letters.ts` — první písmeno jména česky (diakritika, digraf „Ch“).
  Platí **přesně to jedno písmeno**: „Štěpán“ → jen Š, ne i S. Tolerance na
  písmeno bez háčku tam kdysi byla a byla odstraněna záměrně — nevracet.
  Digraf „Ch“ zůstává, to není tolerance, ale správné určení písmene.
- `lib/game/slug.ts` — osobní odkaz ze jména, unikátní v rámci seznamu.
  `toSlugFromUrl()` navíc dekóduje procentové escapy, aby `/Jan-Novák`
  nedopadl na 404. Osobní odkazy jsou doplňková cesta — hlavní je výběr ze
  seznamu, adresu v prohlížeči nezvládne každý.
- `lib/game/random.ts` — kryptografická náhoda (`Math.random` sem nepatří).
- `lib/game/countdown.ts` — **fakta o letošní události na jednom místě**:
  `PIPI_UDALOST` (název), `PIPI_VANOCE` (datum) a `CENA_DARKU` (cena dárku).
  Na další rok se mění jen tady, nikde jinde se nepíšou natvrdo.
  Odpočet je do **oslavy**, ne do konce losování. Počítá se v `Europe/Prague`,
  ne podle serveru, a stránka s ním musí být `force-dynamic` — staticky by se
  počet dní zamrazil při buildu.
- `lib/db/queries/game.ts` — serverová pravidla hry, transakce, zámek.
- `components/VyberJmena.tsx` — výběr vlastního jména ze seznamu a potvrzení
  proti překliknutí. Potvrzení není zdvořilost: bez něj by omylem vybrané cizí
  jméno spotřebovalo cizí los.
- `components/PersonalDraw.tsx` — celá hra jako jedna klientská komponenta.
  Větvení mezi „zalosovat“ a odhalením **musí** zůstat na klientovi: serverový
  přerender po losu by přestavěl strom a zabil probíhající animaci.
- Mlýnek se jmény cykluje **celý** seznam, ne jen zbývající lidi — jinak by
  z animace šlo vyčíst, kdo už losoval.
- `proxy.ts` — HTTP Basic brána pro `/admin` (v Next.js 16 se `middleware.ts`
  jmenuje `proxy.ts`).
- `scripts/seed.ts` — testovací jména. **Jediné místo v repu, kde nějaká jména
  jsou**; obsahují pasti (diakritika, „Ch“, jméno o dvou slovech), takže je
  neochuzuj. `scripts/stav.ts` vypíše stav hry.

## Data

Veškerý stav je v Postgresu (`participants`, `draws`). V prohlížeči se
neukládá **nic** — žádné localStorage, sessionStorage ani cookies. Kdyby se
někdy zaváděl klientský stav, musí to být jen kosmetika (např. rozbalená
sekce), nikdy los ani identita.

## Styl tlačítek a dlaždic

Vzhled klikatelných prvků je ve třídách `.btn*` a `.tile*` v `globals.css`,
protože vrstvené `box-shadow` se v Tailwindu jako inline hodnoty psát nedají.

- `.btn` — lesklá pilulka (gradient, lesk, barevná záře). Pro akce.
- `.tile` — tmavá dlaždice se zlatým okrajem. Pro jména v seznamu
  a pro potvrzovací obrazovku. **Jména se nebarví po jednom** — osm jmen
  v osmi barvách vypadalo jako cirkus.
- Oba musí mít `cursor: pointer`: Tailwind v4 dává v preflightu tlačítkům
  `cursor: default`, takže se to doplňuje ručně.
- Oba musí mít viditelné `:focus-visible`, jinak se hra nedá projít klávesnicí.
- Hráčské obrazovky používají `.tile`; barevné `.btn*` zůstaly jen adminovi,
  kde červená u resetu nese význam.

## Odezva při navigaci

`/[slug]` je dynamická a sahá do databáze, takže přechod na ni chvíli trvá —
v `next dev` sekundy, protože se routa teprve kompiluje. Bez zpětné vazby
uživatel netuší, jestli se něco děje, a mačká znovu. Drží to dvě věci
a **ani jedna se neodstraňuje**:

- `app/[slug]/loading.tsx` — Next ji ukáže hned po kliknutí. Dokumentace to
  doporučuje jako hlavní řešení („Prefer route-level fallbacks with
  loading.js“).
- `useLinkStatus()` v potvrzovacím tlačítku — přepne text na „Chystám tvůj
  los…“. Hook funguje jen uvnitř `<Link>`, proto je to vlastní komponenta.

Změřeno při 600 ms latenci: zpětná vazba do 110 ms, stránka do 1,3 s.

## Styl

- **Vzhled je záměrně kýčovitý** — vánoční červená, zlato, cukrkandl, sněžení,
  blikající světýlka. To není nedopatření, to je zadání.
- Barvy a animace jen přes tokeny v `app/globals.css` (`@theme`), žádné
  natvrdo zapsané hexy v komponentách.
- Animace vždy respektují `prefers-reduced-motion`.
- UI i komentáře česky. Komentáře vysvětlují *proč*, ne *co*.
- Náhodné pozice dekorací (vločky, konfety) musí být deterministické, jinak se
  rozejde hydratace mezi serverem a prohlížečem.
- Vločky mají **záporné** `animation-delay` a animace `animation-fill-mode:
  both`. S kladným zpožděním CSS do jeho konce kreslí nezanimovaný stav —
  všechny vločky pak staticky leží nahoře a postupně „mizí“. Nevracet.

## Než něco odevzdáš

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
