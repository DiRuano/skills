import { numero } from "./csv";
import { valorDoTeste } from "./ciencia/referencia";

/** Campos mínimos do teste para montar resultados (evita importar código de servidor). */
export interface TesteForm {
  id: string;
  nome: string;
  tipo: "numerico" | "criterios";
  maior_melhor: boolean;
  tentativas: number;
  criterio: "melhor" | "media";
  por_lado: boolean;
  criterios: { nome: string; max: number }[] | null;
}

export interface ResultadoNovo {
  teste_id: string;
  lado: "unico" | "D" | "E";
  tentativas: number[];
  valor: number;
  criterios: Record<string, number> | null;
}

/** Nome dos campos do formulário. */
export const campoTentativa = (testeId: string, lado: string, i: number) => `t:${testeId}:${lado}:${i}`;
export const campoCriterio = (testeId: string, i: number) => `c:${testeId}:${i}`;

export function ladosDoTeste(t: Pick<TesteForm, "por_lado">): ("unico" | "D" | "E")[] {
  return t.por_lado ? ["D", "E"] : ["unico"];
}

/**
 * Converte os campos preenchidos em resultados. Teste em branco é ignorado
 * (nem todo aluno faz todos os testes). Valores inválidos viram erro.
 */
export function montarResultados(
  campos: Record<string, string>,
  testes: TesteForm[],
): { resultados: ResultadoNovo[]; erros: string[] } {
  const resultados: ResultadoNovo[] = [];
  const erros: string[] = [];

  for (const t of testes) {
    if (t.tipo === "criterios") {
      const lista = t.criterios ?? [];
      const pont: Record<string, number> = {};
      let algum = false;
      lista.forEach((c, i) => {
        const bruto = campos[campoCriterio(t.id, i)];
        if (bruto == null || bruto.trim() === "") return;
        const v = numero(bruto);
        if (v == null || v < 0 || v > c.max) {
          erros.push(`${t.nome} — ${c.nome}: valor entre 0 e ${c.max}`);
          return;
        }
        pont[c.nome] = v;
        algum = true;
      });
      if (!algum) continue;
      if (Object.keys(pont).length < lista.length) {
        erros.push(`${t.nome}: preencha todos os critérios ou deixe todos em branco`);
        continue;
      }
      resultados.push({
        teste_id: t.id,
        lado: "unico",
        tentativas: [],
        valor: Object.values(pont).reduce((a, b) => a + b, 0),
        criterios: pont,
      });
      continue;
    }

    for (const lado of ladosDoTeste(t)) {
      const tentativas: number[] = [];
      for (let i = 0; i < t.tentativas; i++) {
        const bruto = campos[campoTentativa(t.id, lado, i)];
        if (bruto == null || bruto.trim() === "") continue;
        const v = numero(bruto);
        if (v == null || v < 0) {
          erros.push(`${t.nome}${lado !== "unico" ? ` (${lado})` : ""}: tentativa ${i + 1} inválida`);
          continue;
        }
        tentativas.push(v);
      }
      if (!tentativas.length) continue;
      resultados.push({
        teste_id: t.id,
        lado,
        tentativas,
        valor: valorDoTeste(tentativas, t.criterio, t.maior_melhor)!,
        criterios: null,
      });
    }
  }
  return { resultados, erros };
}
