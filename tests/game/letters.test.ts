import { describe, expect, it } from "vitest";
import { giftLetter } from "@/lib/game/letters";

describe("giftLetter", () => {
  it("vezme první písmeno jména", () => {
    expect(giftLetter("Petr")).toBe("P");
  });

  it("diakritika zůstává — žádná tolerance na písmeno bez háčku", () => {
    expect(giftLetter("Štěpán")).toBe("Š");
    expect(giftLetter("Žofie")).toBe("Ž");
    expect(giftLetter("Řehoř")).toBe("Ř");
    expect(giftLetter("Čeněk")).toBe("Č");
    expect(giftLetter("Áron")).toBe("Á");
  });

  it("„Ch“ je česky jedno písmeno", () => {
    expect(giftLetter("Chalupa")).toBe("Ch");
    expect(giftLetter("chalupa")).toBe("Ch");
    expect(giftLetter("Christián Hájek")).toBe("Ch");
  });

  it("ale samotné C zůstává C", () => {
    expect(giftLetter("Cyril")).toBe("C");
  });

  it("bere křestní jméno, ne příjmení", () => {
    expect(giftLetter("Žofie Dvořáková")).toBe("Ž");
    expect(giftLetter("Jan Novák")).toBe("J");
  });

  it("malé písmeno na vstupu zvětší", () => {
    expect(giftLetter("anna")).toBe("A");
  });

  it("poradí si s mezerami a prázdnem", () => {
    expect(giftLetter("  Jana  ")).toBe("J");
    expect(giftLetter("   ")).toBe("?");
  });
});
