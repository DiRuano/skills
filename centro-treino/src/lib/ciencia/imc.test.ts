import { describe, expect, it } from "vitest";
import casos from "./oms-casos-teste.json";
import { calcularImc, classificarZImc, idadeEmMeses, zImcPorIdade } from "./imc";

describe("IMC por idade — OMS 2007", () => {
  it("calcula o IMC", () => {
    expect(calcularImc(50, 160)).toBeCloseTo(19.53, 2);
  });

  it(`reproduz os z-scores calculados pela OMS (${casos.casos.length} casos)`, () => {
    for (const c of casos.casos) {
      const z = zImcPorIdade(c.sexo as "M" | "F", c.idadeMeses, c.imc);
      expect(z, JSON.stringify(c)).not.toBeNull();
      // A OMS publica os valores arredondados a 2 casas
      expect(Math.abs(z! - c.z), JSON.stringify(c)).toBeLessThanOrEqual(0.005 + 1e-9);
    }
  });

  it("inclui casos extremos (|z| > 3)", () => {
    expect(casos.casos.some((c) => Math.abs(c.z) > 3)).toBe(true);
  });

  it("fora de 5–19 anos retorna null", () => {
    expect(zImcPorIdade("M", 59.9, 16)).toBeNull();
    expect(zImcPorIdade("F", 229, 20)).toBeNull();
  });

  it("idade em meses usa 30,4375 dias por mês", () => {
    expect(idadeEmMeses("2014-01-01", "2024-01-01")).toBeCloseTo(3652 / 30.4375, 6);
  });

  it("classifica pelos pontos de corte da OMS", () => {
    expect(classificarZImc(-3.5)).toBe("Magreza acentuada");
    expect(classificarZImc(-2.5)).toBe("Magreza");
    expect(classificarZImc(0)).toBe("Eutrofia");
    expect(classificarZImc(1.5)).toBe("Sobrepeso");
    expect(classificarZImc(2.5)).toBe("Obesidade");
  });
});
