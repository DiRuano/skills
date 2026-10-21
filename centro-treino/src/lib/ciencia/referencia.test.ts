import { describe, expect, it } from "vitest";
import { comparar, percentilDesempenho, valorDoTeste, zonaDoValor, type Faixa } from "./referencia";
import { importarCsv } from "./importacao";
import { lerCsv, numero } from "../csv";

// Valores FICTÍCIOS — servem só para testar a mecânica, não são normas.
const salto = { P10: 100, P50: 140, P90: 180 };
const sprintCrescente = { P10: 3.6, P50: 4.0, P90: 4.4 }; // P90 = tempo maior (pior)
const sprintDesempenho = { P10: 4.4, P50: 4.0, P90: 3.6 }; // P90 = tempo menor (melhor)

describe("percentil de desempenho", () => {
  it("interpola quando maior é melhor", () => {
    expect(percentilDesempenho(140, salto, true)).toEqual({ percentil: 50, limitado: null });
    expect(percentilDesempenho(160, salto, true)!.percentil).toBe(70);
  });

  it("menor é melhor com tabela em escala de valor: inverte", () => {
    expect(percentilDesempenho(3.8, sprintCrescente, false)!.percentil).toBe(70);
  });

  it("menor é melhor com tabela já em escala de desempenho: não inverte", () => {
    expect(percentilDesempenho(3.8, sprintDesempenho, false)!.percentil).toBe(70);
  });

  it("fora da tabela: limita e sinaliza do ponto de vista do desempenho", () => {
    expect(percentilDesempenho(200, salto, true)).toEqual({ percentil: 90, limitado: "acima" });
    expect(percentilDesempenho(90, salto, true)).toEqual({ percentil: 10, limitado: "abaixo" });
    expect(percentilDesempenho(3.0, sprintCrescente, false)).toEqual({ percentil: 90, limitado: "acima" });
  });
});

describe("comparação com faixas", () => {
  const faixas: Faixa[] = [
    { sexo: "M", idade_min: 12, idade_max: 13, tipo: "percentil", valores: salto },
    { sexo: "F", idade_min: 12, idade_max: 13, tipo: "zona", valores: { zonas: [
      { rotulo: "Fraco", min: null, max: 100 },
      { rotulo: "Bom", min: 100, max: 150 },
      { rotulo: "Excelente", min: 150, max: null },
    ] } },
  ];

  it("sem faixa para sexo/idade → sem referência (nunca inventa)", () => {
    expect(comparar(140, faixas, "M", 13.2, true)).toEqual({ tipo: "sem_referencia" });
    expect(comparar(140, [], "F", 12.5, true)).toEqual({ tipo: "sem_referencia" });
  });

  it("encontra percentil e zona", () => {
    expect(comparar(140, faixas, "M", 12.9, true)).toMatchObject({ tipo: "percentil", percentil: 50 });
    expect(comparar(150, faixas, "F", 12, true)).toMatchObject({ tipo: "zona", zona: "Excelente" });
    expect(zonaDoValor(99.9, (faixas[1] as Extract<Faixa, { tipo: "zona" }>).valores.zonas)).toBe("Fraco");
  });
});

describe("tentativas", () => {
  it("melhor tentativa respeita o sentido do teste", () => {
    expect(valorDoTeste([30, 32, 31], "melhor", true)).toBe(32);
    expect(valorDoTeste([3.9, 3.7], "melhor", false)).toBe(3.7);
    expect(valorDoTeste([30, 32], "media", true)).toBe(31);
    expect(valorDoTeste([], "media", true)).toBeNull();
  });
});

describe("CSV", () => {
  it("lê ponto e vírgula, aspas e vírgula decimal", () => {
    expect(lerCsv('a;b\n"x;y";"12,5"\n')).toEqual([["a", "b"], ["x;y", "12,5"]]);
    expect(numero("12,5")).toBe(12.5);
    expect(numero("")).toBeNull();
  });

  it("importa percentis e valida monotonia e sobreposição", () => {
    const ok = importarCsv("sexo,idade_min,idade_max,P10,P50,P90\nM,9,10,100,140,180\nF,9,10,90,130,170\n", "percentil");
    expect(ok.erros).toEqual([]);
    expect(ok.faixas).toHaveLength(2);
    const ruim = importarCsv("sexo,idade_min,idade_max,P10,P50,P90\nM,9,10,100,190,180\nM,9.5,11,1,2,3\n", "percentil");
    expect(ruim.erros.join(" ")).toMatch(/Linha 2/);
    const sobreposto = importarCsv("sexo,idade_min,idade_max,P10,P90\nM,9,10,1,2\nM,9.5,11,1,2\n", "percentil");
    expect(sobreposto.erros.join(" ")).toMatch(/sobrepostas/);
  });

  it("importa zonas agrupando por faixa", () => {
    const r = importarCsv("sexo,idade_min,idade_max,zona,min,max\nM,9,10,Fraco,,100\nM,9,10,Bom,100,\n", "zona");
    expect(r.erros).toEqual([]);
    expect(r.faixas).toHaveLength(1);
    expect(r.faixas[0].tipo).toBe("zona");
  });
});
