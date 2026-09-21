/**
 * Pravidlo hry: dárek musí začínat na stejné písmeno jako jméno obdarovaného.
 * Tenhle modul určuje, které písmeno to je — česky, tedy s diakritikou
 * a s „Ch“ jako jedním písmenem.
 *
 * Platí přesně to jedno písmeno. Dřív se tolerovala i varianta bez háčku
 * („Štěpán → Š, uznáváme i S“), ale to je pryč: pravidlo je teď jednoznačné.
 */

/**
 * Určí písmeno dárku pro dané jméno. Bere **křestní jméno**, ne příjmení —
 * „Žofie Dvořáková“ dá Ž.
 *
 * „Ch“ je v češtině jedno písmeno, takže Chalupa → „Ch“, ne „C“. Není to
 * tolerance, ale správné určení písmene: „chleba“ na C nezačíná.
 */
export function giftLetter(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "?";

  // Digraf „Ch“ — jen když za C následuje h (Chalupa ano, Cyril ne).
  if (trimmed.slice(0, 2).toLowerCase() === "ch") return "Ch";

  return trimmed[0].toLocaleUpperCase("cs-CZ");
}
