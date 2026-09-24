import { describe, expect, it } from "vitest";
import { formatParticipantLines, parseParticipantLines } from "@/lib/game/groups";

describe("parseParticipantLines", () => {
  it("řádek s „+“ je jedna skupina, ostatní jsou jednotlivci", () => {
    expect(
      parseParticipantLines([
        "Lukáš Paroulek + Tereza Paroulková",
        "Tomáš Svoboda+Eliška Čápová",
        "Filip Dyrčík",
        "Monika Zemanová",
      ]),
    ).toEqual({
      ok: true,
      groups: [
        ["Lukáš Paroulek", "Tereza Paroulková"],
        ["Tomáš Svoboda", "Eliška Čápová"],
        ["Filip Dyrčík"],
        ["Monika Zemanová"],
      ],
    });
  });

  it("uklidí mezery, prázdné řádky a osamocené „+“", () => {
    expect(parseParticipantLines(["  Jan   Novák  +  ", "", "   ", "+", "Petr Svoboda"])).toEqual({
      ok: true,
      groups: [["Jan Novák"], ["Petr Svoboda"]],
    });
  });

  it("dvakrát totéž jméno odmítne, i s jinou velikostí písmen", () => {
    const r = parseParticipantLines(["Jana Nováková + Petr Novák", "jana nováková", "Eva Malá"]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.detail).toContain("dvakrát");
  });

  it("chce aspoň dva lidi", () => {
    expect(parseParticipantLines(["Jan Novák"]).ok).toBe(false);
    expect(parseParticipantLines([]).ok).toBe(false);
  });

  it("odmítne seznam, který nejde rozlosovat, a řekne kvůli komu", () => {
    const r = parseParticipantLines(["Jan Novák + Jana Nováková", "Petr Svoboda"]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.detail).toContain("Jan Novák + Jana Nováková");

    expect(parseParticipantLines(["Jan Novák + Jana Nováková"]).ok).toBe(false);
  });

  it("dva páry, nebo skupina přesně na polovinu, rozlosovat jdou", () => {
    expect(parseParticipantLines(["A A + B B", "C C + D D"]).ok).toBe(true);
    expect(parseParticipantLines(["A A + B B + C C", "D D", "E E", "F F"]).ok).toBe(true);
  });

  it("formatParticipantLines vrátí řádky, které se znovu načtou stejně", () => {
    const groups = [["Lukáš Paroulek", "Tereza Paroulková"], ["Filip Dyrčík"], ["Eva Malá"]];
    const lines = formatParticipantLines(groups);
    expect(lines).toEqual(["Lukáš Paroulek + Tereza Paroulková", "Filip Dyrčík", "Eva Malá"]);
    expect(parseParticipantLines(lines)).toEqual({ ok: true, groups });
  });
});
