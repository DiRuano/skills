import { lerCsv, numero } from "../csv";
import type { Faixa } from "./referencia";

/**
 * Importação de tabela de referência via CSV.
 *
 * Modelo PERCENTIL — uma linha por sexo e faixa etária:
 *   sexo,idade_min,idade_max,P5,P10,P20,...,P95
 * Modelo ZONA — uma linha por zona:
 *   sexo,idade_min,idade_max,zona,min,max
 * idade_min inclusiva e idade_max exclusiva, em anos (ex.: 9 e 10 = de 9,00 a 9,99).
 */

export const MODELO_PERCENTIL =
  "sexo,idade_min,idade_max,P5,P10,P20,P30,P40,P50,P60,P70,P80,P90,P95\n" +
  "M,9,10,,,,,,,,,,,\nF,9,10,,,,,,,,,,,\n";
export const MODELO_ZONA =
  "sexo,idade_min,idade_max,zona,min,max\n" +
  "M,9,10,Fraco,,\nM,9,10,Razoável,,\nM,9,10,Bom,,\nM,9,10,Muito bom,,\nM,9,10,Excelente,,\n";

export type ResultadoImportacao = { faixas: Faixa[]; erros: string[] };

function sexoValido(s: string): "M" | "F" | null {
  const u = s.toUpperCase();
  return u === "M" || u === "F" ? u : null;
}

export function importarCsv(texto: string, tipo: "percentil" | "zona"): ResultadoImportacao {
  const linhas = lerCsv(texto);
  const erros: string[] = [];
  if (linhas.length < 2) return { faixas: [], erros: ["O arquivo precisa ter cabeçalho e ao menos uma linha"] };
  const cab = linhas[0].map((c) => c.toLowerCase());
  const idx = (n: string) => cab.indexOf(n);
  for (const obrig of ["sexo", "idade_min", "idade_max"]) {
    if (idx(obrig) < 0) erros.push(`Coluna obrigatória ausente: ${obrig}`);
  }
  if (erros.length) return { faixas: [], erros };

  if (tipo === "percentil") {
    const colunasP = cab
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => /^p\d+(\.\d+)?$/.test(c));
    if (colunasP.length < 2) return { faixas: [], erros: ["Informe ao menos duas colunas de percentil (ex.: P5, P50, P95)"] };
    const faixas: Faixa[] = [];
    linhas.slice(1).forEach((l, n) => {
      const nl = n + 2;
      const sexo = sexoValido(l[idx("sexo")] ?? "");
      const ini = numero(l[idx("idade_min")]);
      const fim = numero(l[idx("idade_max")]);
      if (!sexo || ini == null || fim == null || fim <= ini) {
        erros.push(`Linha ${nl}: sexo (M/F) e idades válidas são obrigatórios (idade_max > idade_min)`);
        return;
      }
      const valores: Record<string, number> = {};
      for (const { c, i } of colunasP) {
        const v = numero(l[i]);
        if (v != null) valores[c.toUpperCase()] = v;
      }
      const vs = Object.entries(valores)
        .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)))
        .map(([, v]) => v);
      if (vs.length < 2) {
        erros.push(`Linha ${nl}: preencha ao menos dois percentis`);
        return;
      }
      const cresce = vs.every((v, i) => i === 0 || v >= vs[i - 1]);
      const decresce = vs.every((v, i) => i === 0 || v <= vs[i - 1]);
      if (!cresce && !decresce) {
        erros.push(`Linha ${nl}: os valores precisam crescer (ou decrescer) de forma contínua com o percentil`);
        return;
      }
      faixas.push({ sexo, idade_min: ini, idade_max: fim, tipo: "percentil", valores });
    });
    verificarSobreposicao(faixas, erros);
    return { faixas, erros };
  }

  // Zonas: agrupa por sexo + faixa etária
  for (const obrig of ["zona", "min", "max"]) {
    if (idx(obrig) < 0) erros.push(`Coluna obrigatória ausente: ${obrig}`);
  }
  if (erros.length) return { faixas: [], erros };
  const grupos = new Map<string, Extract<Faixa, { tipo: "zona" }>>();
  linhas.slice(1).forEach((l, n) => {
    const nl = n + 2;
    const sexo = sexoValido(l[idx("sexo")] ?? "");
    const ini = numero(l[idx("idade_min")]);
    const fim = numero(l[idx("idade_max")]);
    const rotulo = l[idx("zona")];
    const min = numero(l[idx("min")]);
    const max = numero(l[idx("max")]);
    if (!sexo || ini == null || fim == null || fim <= ini || !rotulo) {
      erros.push(`Linha ${nl}: sexo, idades e nome da zona são obrigatórios`);
      return;
    }
    if (min == null && max == null) {
      erros.push(`Linha ${nl}: informe min e/ou max da zona "${rotulo}"`);
      return;
    }
    const chave = `${sexo}|${ini}|${fim}`;
    if (!grupos.has(chave)) grupos.set(chave, { sexo, idade_min: ini, idade_max: fim, tipo: "zona", valores: { zonas: [] } });
    grupos.get(chave)!.valores.zonas.push({ rotulo, min, max });
  });
  const faixas = [...grupos.values()];
  verificarSobreposicao(faixas, erros);
  return { faixas, erros };
}

function verificarSobreposicao(faixas: Faixa[], erros: string[]) {
  for (let i = 0; i < faixas.length; i++) {
    for (let j = i + 1; j < faixas.length; j++) {
      const a = faixas[i];
      const b = faixas[j];
      if (a.sexo === b.sexo && a.idade_min < b.idade_max && b.idade_min < a.idade_max) {
        erros.push(`Faixas sobrepostas para sexo ${a.sexo}: ${a.idade_min}–${a.idade_max} e ${b.idade_min}–${b.idade_max}`);
      }
    }
  }
}
