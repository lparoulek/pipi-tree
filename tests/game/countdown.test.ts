import { describe, expect, it } from "vitest";
import {
  datumCesky,
  daysUntil,
  dnyCesky,
  jednotkaDnu,
  odpocet,
  PIPI_VANOCE,
  slovesoZbyva,
} from "@/lib/game/countdown";

describe("daysUntil", () => {
  it("spočítá dny do termínu", () => {
    expect(daysUntil("2026-12-18", new Date("2026-12-17T10:00:00Z"))).toBe(1);
    expect(daysUntil("2026-12-18", new Date("2026-12-18T10:00:00Z"))).toBe(0);
    expect(daysUntil("2026-12-18", new Date("2026-09-21T10:00:00Z"))).toBe(88);
  });

  it("po termínu je záporné", () => {
    expect(daysUntil("2026-12-18", new Date("2026-12-20T10:00:00Z"))).toBe(-2);
  });

  it("počítá v české zóně, ne v UTC", () => {
    // 17. 12. ve 23:30 v Praze je v UTC ještě 22:30 téhož dne → zbývá 1 den.
    expect(daysUntil("2026-12-18", new Date("2026-12-17T22:30:00Z"))).toBe(1);
    // Ale 23:30 UTC už je v Praze 18. 12. 00:30 → je to dnes.
    expect(daysUntil("2026-12-18", new Date("2026-12-17T23:30:00Z"))).toBe(0);
  });

  it("nespletou ji letní a zimní čas", () => {
    // V červenci má Praha +2, v prosinci +1; obojí musí dát správný den.
    expect(daysUntil("2026-07-02", new Date("2026-07-01T22:30:00Z"))).toBe(0);
    expect(daysUntil("2026-07-02", new Date("2026-07-01T21:30:00Z"))).toBe(1);
  });
});

describe("jednotkaDnu", () => {
  it("skloňuje jednotku", () => {
    expect(jednotkaDnu(1)).toBe("den");
    expect(jednotkaDnu(3)).toBe("dny");
    expect(jednotkaDnu(9)).toBe("dní");
  });
});

describe("dnyCesky", () => {
  it("skloňuje správně", () => {
    expect(dnyCesky(1)).toBe("1 den");
    expect(dnyCesky(2)).toBe("2 dny");
    expect(dnyCesky(4)).toBe("4 dny");
    expect(dnyCesky(5)).toBe("5 dní");
    expect(dnyCesky(21)).toBe("21 dní");
    expect(dnyCesky(88)).toBe("88 dní");
  });
});

describe("slovesoZbyva", () => {
  it("skloňuje i sloveso — u 2–4 se mění", () => {
    expect(slovesoZbyva(1)).toBe("zbývá");
    expect(slovesoZbyva(2)).toBe("zbývají");
    expect(slovesoZbyva(4)).toBe("zbývají");
    expect(slovesoZbyva(5)).toBe("zbývá");
    expect(slovesoZbyva(88)).toBe("zbývá");
  });
});

describe("odpocet", () => {
  // Cílové datum se předává výslovně, aby testy nepadaly při změně termínu.
  const CIL = "2026-12-19";

  it("před termínem vrátí počet dní", () => {
    expect(odpocet(new Date("2026-12-16T10:00:00Z"), CIL)).toEqual({
      state: "pred",
      days: 3,
      unit: "dny",
      verb: "zbývají",
      text: "3 dny",
    });
  });

  it("v den termínu hlásí dnes", () => {
    expect(odpocet(new Date("2026-12-19T08:00:00Z"), CIL)).toEqual({ state: "dnes" });
  });

  it("po termínu hlásí, kolik dní je to za námi", () => {
    expect(odpocet(new Date("2026-12-26T08:00:00Z"), CIL)).toEqual({ state: "po", days: 7 });
  });
});

describe("datumCesky", () => {
  it("vypíše nastavený termín česky", () => {
    // Zároveň dokumentuje, kdy Pipiovy Vánoce letos jsou.
    expect(datumCesky(PIPI_VANOCE)).toBe("19. prosince 2026");
  });
});
