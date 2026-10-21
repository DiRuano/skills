import { describe, expect, it } from "vitest";
import { aplicarDescontoIrmaos, maxParcelas, parcelasPermitidas, validarParcelas } from "./regras";

describe("parcelamento segue a duração do plano", () => {
  it("mensal só à vista; trimestral 3x; semestral 6x; anual 12x", () => {
    expect(maxParcelas("mensal")).toBe(1);
    expect(maxParcelas("trimestral")).toBe(3);
    expect(maxParcelas("semestral")).toBe(6);
    expect(maxParcelas("anual")).toBe(12);
    expect(parcelasPermitidas("semestral")).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("recusa parcelas acima do permitido", () => {
    expect(validarParcelas("mensal", 2)).toBe("O plano mensal é pago à vista");
    expect(validarParcelas("semestral", 7)).toMatch(/até 6x/);
    expect(validarParcelas("anual", 12)).toBeNull();
    expect(validarParcelas("anual", 0)).not.toBeNull();
  });
});

describe("desconto de irmãos", () => {
  it("1º filho cheio, demais com 10%", () => {
    expect(aplicarDescontoIrmaos([30000, 30000, 25000])).toEqual([30000, 27000, 22500]);
    expect(aplicarDescontoIrmaos([19990])).toEqual([19990]);
    expect(aplicarDescontoIrmaos([19990, 19990])).toEqual([19990, 17991]);
  });
});
