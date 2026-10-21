/**
 * Comparação de um resultado com uma tabela de referência CADASTRADA pelo treinador.
 * Este módulo nunca cria valores normativos: sem faixa cadastrada, retorna "sem referência".
 */

export const PERCENTIS = [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95, 97, 99] as const;

export type Faixa =
  | { sexo: "M" | "F"; idade_min: number; idade_max: number; tipo: "percentil"; valores: Record<string, number> }
  | {
      sexo: "M" | "F";
      idade_min: number;
      idade_max: number;
      tipo: "zona";
      valores: { zonas: { rotulo: string; min: number | null; max: number | null }[] };
    };

export type Comparacao =
  | { tipo: "sem_referencia" }
  | { tipo: "percentil"; percentil: number; limitado: "abaixo" | "acima" | null; faixa: Faixa }
  | { tipo: "zona"; zona: string; faixa: Faixa };

/** Faixa que cobre a idade (anos decimais): idade_min ≤ idade < idade_max. */
export function encontrarFaixa(faixas: Faixa[], sexo: "M" | "F", idade: number): Faixa | null {
  return faixas.find((f) => f.sexo === sexo && idade >= f.idade_min && idade < f.idade_max) ?? null;
}

/** Lê pares (percentil, valor) de colunas "P5", "P10"... ordenados pelo percentil. */
export function paresPercentil(valores: Record<string, number>): [number, number][] {
  return Object.entries(valores)
    .map(([k, v]) => [Number(k.replace(/^P/i, "")), Number(v)] as [number, number])
    .filter(([p, v]) => Number.isFinite(p) && Number.isFinite(v))
    .sort((a, b) => a[0] - b[0]);
}

/**
 * Percentil de DESEMPENHO (maior = melhor desempenho) por interpolação linear.
 *
 * Tabelas publicadas podem ordenar testes de tempo de dois jeitos: P95 = tempo maior
 * (valor cresce com o percentil) ou P95 = tempo menor (já em escala de desempenho).
 * A direção é detectada pelos próprios valores da tabela:
 *  - valores crescem com o percentil → percentil de valor; se "menor é melhor", inverte (100 − p);
 *  - valores decrescem com o percentil → a tabela já está em escala de desempenho.
 * Fora do intervalo tabelado, o resultado é limitado ao extremo e sinalizado.
 */
export function percentilDesempenho(
  valor: number,
  valores: Record<string, number>,
  maiorMelhor: boolean,
): { percentil: number; limitado: "abaixo" | "acima" | null } | null {
  const pares = paresPercentil(valores);
  if (pares.length < 2) return null;
  const crescente = pares[pares.length - 1][1] > pares[0][1];
  // Reordena por valor crescente para interpolar
  const porValor = crescente ? pares : [...pares].reverse();

  let p: number;
  let limitado: "abaixo" | "acima" | null = null;
  if (valor <= porValor[0][1]) {
    p = porValor[0][0];
    if (valor < porValor[0][1]) limitado = "abaixo";
  } else if (valor >= porValor[porValor.length - 1][1]) {
    p = porValor[porValor.length - 1][0];
    if (valor > porValor[porValor.length - 1][1]) limitado = "acima";
  } else {
    p = porValor[0][0];
    for (let i = 0; i < porValor.length - 1; i++) {
      const [p1, v1] = porValor[i];
      const [p2, v2] = porValor[i + 1];
      if (valor >= v1 && valor <= v2) {
        p = v2 === v1 ? (p1 + p2) / 2 : p1 + ((valor - v1) / (v2 - v1)) * (p2 - p1);
        break;
      }
    }
  }

  const precisaInverter = crescente && !maiorMelhor;
  const percentil = precisaInverter ? 100 - p : p;
  // "limitado" descreve o desempenho: acima do melhor tabelado ou abaixo do pior
  let lim = limitado;
  if (lim) {
    const valorAlto = lim === "acima";
    const desempenhoAlto = maiorMelhor ? valorAlto : !valorAlto;
    lim = desempenhoAlto ? "acima" : "abaixo";
  }
  return { percentil: Math.round(percentil * 10) / 10, limitado: lim };
}

/** Zona em que o valor cai (min inclusivo, max exclusivo; null = aberto). */
export function zonaDoValor(valor: number, zonas: { rotulo: string; min: number | null; max: number | null }[]): string | null {
  const z = zonas.find((z) => (z.min == null || valor >= z.min) && (z.max == null || valor < z.max));
  return z?.rotulo ?? null;
}

export function comparar(
  valor: number,
  faixas: Faixa[],
  sexo: "M" | "F",
  idade: number,
  maiorMelhor: boolean,
): Comparacao {
  const faixa = encontrarFaixa(faixas, sexo, idade);
  if (!faixa) return { tipo: "sem_referencia" };
  if (faixa.tipo === "percentil") {
    const r = percentilDesempenho(valor, faixa.valores, maiorMelhor);
    return r ? { tipo: "percentil", ...r, faixa } : { tipo: "sem_referencia" };
  }
  const zona = zonaDoValor(valor, faixa.valores.zonas);
  return zona ? { tipo: "zona", zona, faixa } : { tipo: "sem_referencia" };
}

/** Rótulo amigável para pais a partir do percentil (sem julgamento de valor). */
export function descreverPercentil(p: number): string {
  if (p < 20) return "abaixo da maioria";
  if (p < 40) return "um pouco abaixo da média";
  if (p <= 60) return "na média";
  if (p <= 80) return "um pouco acima da média";
  return "acima da maioria";
}

/** Valor que conta para o teste a partir das tentativas. */
export function valorDoTeste(tentativas: number[], criterio: "melhor" | "media", maiorMelhor: boolean): number | null {
  const v = tentativas.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  if (criterio === "media") return v.reduce((a, b) => a + b, 0) / v.length;
  return maiorMelhor ? Math.max(...v) : Math.min(...v);
}
