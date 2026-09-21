/**
 * Osobní odkaz každého člověka: `domena/jannovak`.
 *
 * Slug se odvozuje ze jména, aby byl odkaz jednoduše replikovatelný a dal se
 * nadiktovat po telefonu. Důsledek, který je potřeba znát: **slug je
 * uhodnutelný**. Kdo zkusí `/petrsvoboda`, dostane se k cizímu losu. Je to
 * vědomá volba ve prospěch pohodlí — hra je pro jednu domácnost, kde se lidi
 * znají. Kdyby to přestalo stačit, stačí do slugu přidat náhodnou příponu.
 */

/** Čeština bez diakritiky — „Štěpán“ → „stepan“, „Kůň“ → „kun“. */
function stripDiacritics(text: string): string {
  // NFD rozloží „š“ na „s“ + háček, druhý krok háčky zahodí.
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Vyrobí slug z jednoho jména. Vrací prázdný string, když ze jména nic
 * použitelného nezbyde (např. jméno jen z emoji) — volající to musí ošetřit.
 */
export function toSlug(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
}

/**
 * Slug z hodnoty, která přišla z adresního řádku.
 *
 * Prohlížeč pošle „á“ jako `%C3%A1`, takže se musí nejdřív dekódovat — jinak
 * by z `/Jan-Novák` vyšlo `jannovc3a1k` a člověk by dostal 404 přesně v tom
 * případě, kdy mu chceme odkaz odpustit.
 */
export function toSlugFromUrl(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Rozbitý escape (`%`, `%zz`) shodí decodeURIComponent. Vezmeme tedy to,
    // co přišlo — padat kvůli překlepu v adrese nemá smysl.
  }
  return toSlug(decoded);
}

/**
 * Přiřadí slugy celému seznamu jmen tak, aby byly unikátní.
 *
 * Kolize řeší číslem na konci („Jana Novák“ i „Jan Anovák“ → `jannovak`,
 * `jannovak2`), protože bez toho by dva lidé sdíleli jeden odkaz a viděli
 * si navzájem do losů.
 */
export function assignSlugs(names: readonly string[]): { name: string; slug: string }[] {
  const used = new Set<string>();

  return names.map((name, index) => {
    const base = toSlug(name) || `clen${index + 1}`;
    let slug = base;
    let counter = 2;
    while (used.has(slug)) slug = `${base}${counter++}`;
    used.add(slug);
    return { name, slug };
  });
}
