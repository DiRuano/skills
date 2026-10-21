import { describe, expect, it } from "vitest";
import { ehMenor, formatarData, hojeSP, idadeAnos, idadeDecimal } from "./idade";

describe("idade", () => {
  it("conta anos completos considerando o aniversário", () => {
    expect(idadeAnos("2010-10-21", "2026-10-20")).toBe(15);
    expect(idadeAnos("2010-10-21", "2026-10-21")).toBe(16);
    expect(idadeAnos("2008-02-29", "2026-02-28")).toBe(17);
  });

  it("identifica menor de idade no limite dos 18", () => {
    expect(ehMenor("2008-10-22", "2026-10-21")).toBe(true);
    expect(ehMenor("2008-10-21", "2026-10-21")).toBe(false);
  });

  it("idade decimal", () => {
    expect(idadeDecimal("2014-01-01", "2026-01-01")).toBeCloseTo(12, 1);
    expect(idadeDecimal("2014-01-01", "2026-07-02")).toBeCloseTo(12.5, 1);
  });

  it("hoje no fuso de São Paulo (UTC-3)", () => {
    // 02:00 UTC de 22/10 ainda é 21/10 em São Paulo
    expect(hojeSP(new Date("2026-10-22T02:00:00Z"))).toBe("2026-10-21");
  });

  it("formata data brasileira", () => {
    expect(formatarData("2014-03-09")).toBe("09/03/2014");
  });
});
