import { describe, expect, it } from "vitest";
import { campoCriterio, campoTentativa, montarResultados, type TesteForm } from "./resultados";

const preensao: TesteForm = { id: "p", nome: "Preensão", tipo: "numerico", maior_melhor: true, tentativas: 2, criterio: "melhor", por_lado: true, criterios: null };
const sprint: TesteForm = { id: "s", nome: "Sprint", tipo: "numerico", maior_melhor: false, tentativas: 2, criterio: "melhor", por_lado: false, criterios: null };
const qm: TesteForm = { id: "q", nome: "QM", tipo: "criterios", maior_melhor: true, tentativas: 1, criterio: "melhor", por_lado: false, criterios: [{ nome: "Agachamento", max: 3 }, { nome: "Hop", max: 3 }] };

describe("montar resultados do formulário", () => {
  it("melhor tentativa por lado; menor tempo no sprint; vírgula decimal", () => {
    const r = montarResultados(
      {
        [campoTentativa("p", "D", 0)]: "22,5",
        [campoTentativa("p", "D", 1)]: "24",
        [campoTentativa("p", "E", 0)]: "21",
        [campoTentativa("s", "unico", 0)]: "3,92",
        [campoTentativa("s", "unico", 1)]: "3,85",
      },
      [preensao, sprint, qm],
    );
    expect(r.erros).toEqual([]);
    expect(r.resultados).toEqual([
      { teste_id: "p", lado: "D", tentativas: [22.5, 24], valor: 24, criterios: null },
      { teste_id: "p", lado: "E", tentativas: [21], valor: 21, criterios: null },
      { teste_id: "s", lado: "unico", tentativas: [3.92, 3.85], valor: 3.85, criterios: null },
    ]);
  });

  it("critérios somam e respeitam o máximo", () => {
    const ok = montarResultados({ [campoCriterio("q", 0)]: "2", [campoCriterio("q", 1)]: "3" }, [qm]);
    expect(ok.resultados[0]).toMatchObject({ valor: 5, criterios: { Agachamento: 2, Hop: 3 } });
    const ruim = montarResultados({ [campoCriterio("q", 0)]: "4", [campoCriterio("q", 1)]: "1" }, [qm]);
    expect(ruim.erros[0]).toMatch(/entre 0 e 3/);
    const incompleto = montarResultados({ [campoCriterio("q", 0)]: "2" }, [qm]);
    expect(incompleto.erros[0]).toMatch(/todos os critérios/);
  });

  it("ignora teste em branco e acusa valor inválido", () => {
    expect(montarResultados({}, [preensao, sprint, qm]).resultados).toEqual([]);
    expect(montarResultados({ [campoTentativa("s", "unico", 0)]: "abc" }, [sprint]).erros).toHaveLength(1);
  });
});
