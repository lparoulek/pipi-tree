import { randomInt as nodeRandomInt } from "node:crypto";

/**
 * Kryptografická náhoda pro losování. `Math.random()` sem nepatří — je
 * predikovatelný a u losování dárků chceme, aby se výsledek nedal dopředu
 * spočítat.
 */
export function randomInt(exclusiveMax: number): number {
  return nodeRandomInt(exclusiveMax);
}
