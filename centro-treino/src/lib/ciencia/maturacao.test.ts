import { describe, expect, it } from "vitest";
import {
  classificarFase,
  comprimentoPerna,
  idadeBiologica,
  idadePhv,
  maturityOffset,
  offsetMirwald,
  offsetMoore,
  preverEstaturaAdultaKR,
  velocidadeCrescimento,
} from "./maturacao";

// Exemplos numéricos calculados à mão com as equações publicadas.
const menino = { sexo: "M" as const, idade: 13, estatura: 160, alturaSentado: 82, massa: 50 };
const menina = { sexo: "F" as const, idade: 11.5, estatura: 148, alturaSentado: 76, massa: 40 };

describe("Mirwald et al. (2002)", () => {
  it("menino 13 a, 160 cm, AS 82 cm, 50 kg", () => {
    // CP = 78; CP·AS = 6396; I·CP = 1014; I·AS = 1066; M/E·100 = 31,25
    // −9,236 + 1,7320368 − 1,686282 + 7,692256 + 0,71625 = −0,7817392
    expect(comprimentoPerna(160, 82)).toBe(78);
    expect(offsetMirwald(menino)).toBeCloseTo(-0.7817392, 6);
  });

  it("menina 11,5 a, 148 cm, AS 76 cm, 40 kg", () => {
    // CP = 72; CP·AS = 5472; I·CP = 828; I·AS = 874; I·M = 460; M/E·100 = 27,027027
    // −9,376 + 1,0298304 + 1,8216 + 5,105034 − 1,22268 + 2,0791892 = −0,5630264
    expect(offsetMirwald(menina)).toBeCloseTo(-0.5630264, 6);
  });
});

describe("Moore et al. (2015)", () => {
  it("menino: −8,128741 + 0,0070346·(13·82) = −0,6298574", () => {
    expect(offsetMoore(menino)).toBeCloseTo(-0.6298574, 6);
  });
  it("menina: −7,709133 + 0,0042232·(11,5·148) = −0,5212466", () => {
    expect(offsetMoore(menina)).toBeCloseTo(-0.5212466, 6);
  });
  it("seleção de equação", () => {
    expect(maturityOffset(menino, "moore_2015")).toBe(offsetMoore(menino));
    expect(maturityOffset(menino, "mirwald_2002")).toBe(offsetMirwald(menino));
  });
});

describe("derivados", () => {
  it("APHV = idade − offset", () => {
    expect(idadePhv(13, -0.63)).toBeCloseTo(13.63, 6);
  });

  it("classifica a fase com limiares padrão e configuráveis", () => {
    expect(classificarFase(-1.5)).toBe("pre_phv");
    expect(classificarFase(-1)).toBe("circa_phv");
    expect(classificarFase(0.4)).toBe("circa_phv");
    expect(classificarFase(1.01)).toBe("pos_phv");
    expect(classificarFase(-0.7, { inicioCirca: -0.5, fimCirca: 0.5 })).toBe("pre_phv");
  });

  it("idade biológica exige referência cadastrada", () => {
    expect(idadeBiologica(-0.5, null)).toBeNull();
    expect(idadeBiologica(-0.5, 14)).toBeCloseTo(13.5, 6);
  });

  it("velocidade de crescimento em cm/ano", () => {
    const v = velocidadeCrescimento({ data: "2026-01-01", estatura: 150 }, { data: "2026-07-02", estatura: 154 })!;
    expect(v.cmAno).toBeCloseTo(4 / (182 / 365.25), 6);
    expect(v.confiavel).toBe(true);
    expect(velocidadeCrescimento({ data: "2026-01-01", estatura: 150 }, { data: "2026-02-01", estatura: 151 })!.confiavel).toBe(false);
    expect(velocidadeCrescimento({ data: "2026-01-01", estatura: 150 }, { data: "2026-01-01", estatura: 151 })).toBeNull();
  });
});

describe("Khamis-Roche — mecânica (coeficientes FICTÍCIOS, só para testar a conta)", () => {
  const tabelaFicticia = [{ idade: 12, intercepto: 10, coefEstatura: 0.5, coefMassa: 0.1, coefEstaturaPais: 0.4 }];

  it("sem tabela cadastrada, não calcula", () => {
    expect(preverEstaturaAdultaKR({ idade: 12, estatura: 150, massa: 40, estaturaMae: 160, estaturaPai: 175 }, [])).toEqual({
      erro: "Coeficientes de Khamis-Roche não cadastrados",
    });
  });

  it("converte cm/kg para pol/lb e volta para cm", () => {
    const r = preverEstaturaAdultaKR(
      { idade: 12.1, estatura: 152.4, massa: 45.359237, estaturaMae: 160.02, estaturaPai: 175.26 },
      tabelaFicticia,
    );
    // 152,4 cm = 60 pol; 45,359237 kg = 100 lb; pais = 63 e 69 pol → média 66
    // 10 + 0,5·60 + 0,1·100 + 0,4·66 = 76,4 pol = 194,056 cm
    if ("erro" in r) throw new Error(r.erro);
    expect(r.estaturaAdultaCm).toBeCloseTo(194.056, 3);
    expect(r.percentualAtingido).toBeCloseTo((152.4 / 194.056) * 100, 4);
  });

  it("recusa idade fora da tabela", () => {
    const r = preverEstaturaAdultaKR({ idade: 14, estatura: 150, massa: 40, estaturaMae: 160, estaturaPai: 175 }, tabelaFicticia);
    expect("erro" in r).toBe(true);
  });
});
