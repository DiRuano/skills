import { describe, expect, it } from "vitest";
import { velocidadeDoEstagio, vo2maxLeger } from "./aerobio";

describe("vai-e-vem 20 m (Léger et al., 1988)", () => {
  it("estágio 1 = 8,5 km/h; estágio 6 = 11 km/h", () => {
    expect(velocidadeDoEstagio(1)).toBe(8.5);
    expect(velocidadeDoEstagio(6)).toBe(11);
  });

  it("12 anos, estágio 6 → 47,9422 mL·kg⁻¹·min⁻¹", () => {
    // 31,025 + 35,618 − 38,976 + 20,2752 = 47,9422
    expect(vo2maxLeger(6, 12.7)).toBeCloseTo(47.9422, 4);
  });

  it("fora da faixa etária não calcula", () => {
    expect(vo2maxLeger(6, 5.9)).toBeNull();
    expect(vo2maxLeger(6, 19)).toBeNull();
    expect(vo2maxLeger(0, 12)).toBeNull();
  });
});
