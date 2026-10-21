/**
 * Maturação somática: maturity offset (anos até/desde o PHV), idade do PHV,
 * % da estatura adulta predita e velocidade de crescimento.
 *
 * Unidades: idade em anos decimais; estatura, altura sentado e comprimento
 * de perna em cm; massa em kg.
 *
 * ATENÇÃO: coeficientes transcritos dos artigos originais. Conferir com os
 * PDFs na revisão científica (ver docs/decisoes.md).
 */

export const FONTE_MIRWALD_2002 =
  "Mirwald RL, Baxter-Jones ADG, Bailey DA, Beunen GP. An assessment of maturity from anthropometric measurements. Med Sci Sports Exerc. 2002;34(4):689-94. doi:10.1097/00005768-200204000-00020";
export const FONTE_MOORE_2015 =
  "Moore SA, McKay HA, Macdonald H, et al. Enhancing a somatic maturity prediction model. Med Sci Sports Exerc. 2015;47(8):1755-64. doi:10.1249/MSS.0000000000000588";
export const FONTE_KHAMIS_ROCHE_1994 =
  "Khamis HJ, Roche AF. Predicting adult stature without using skeletal age: the Khamis-Roche method. Pediatrics. 1994;94(4 Pt 1):504-7. (Errata: Pediatrics. 1995;95(3):457)";

export type Sexo = "M" | "F";

export interface MedidasMaturacao {
  sexo: Sexo;
  idade: number; // anos decimais na data da avaliação
  estatura: number; // cm
  alturaSentado: number; // cm
  massa: number; // kg
}

export type Equacao = "mirwald_2002" | "moore_2015";

export const NOME_EQUACAO: Record<Equacao, string> = {
  mirwald_2002: "Mirwald et al. (2002)",
  moore_2015: "Moore et al. (2015)",
};

/** Comprimento de perna = estatura − altura sentado. */
export function comprimentoPerna(estatura: number, alturaSentado: number): number {
  return estatura - alturaSentado;
}

/**
 * Mirwald et al. (2002). A razão massa/estatura entra multiplicada por 100.
 * Meninos: −9,236 + 0,0002708·(CP·AS) − 0,001663·(I·CP) + 0,007216·(I·AS) + 0,02292·(M/E·100)
 * Meninas: −9,376 + 0,0001882·(CP·AS) + 0,0022·(I·CP) + 0,005841·(I·AS) − 0,002658·(I·M) + 0,07693·(M/E·100)
 */
export function offsetMirwald({ sexo, idade, estatura, alturaSentado, massa }: MedidasMaturacao): number {
  const cp = comprimentoPerna(estatura, alturaSentado);
  const as = alturaSentado;
  const razao = (massa / estatura) * 100;
  if (sexo === "M") {
    return -9.236 + 0.0002708 * (cp * as) - 0.001663 * (idade * cp) + 0.007216 * (idade * as) + 0.02292 * razao;
  }
  return (
    -9.376 +
    0.0001882 * (cp * as) +
    0.0022 * (idade * cp) +
    0.005841 * (idade * as) -
    0.002658 * (idade * massa) +
    0.07693 * razao
  );
}

/**
 * Moore et al. (2015) — modelos simplificados.
 * Meninos: −8,128741 + 0,0070346·(idade·altura sentado)
 * Meninas: −7,709133 + 0,0042232·(idade·estatura)
 */
export function offsetMoore({ sexo, idade, estatura, alturaSentado }: MedidasMaturacao): number {
  return sexo === "M"
    ? -8.128741 + 0.0070346 * (idade * alturaSentado)
    : -7.709133 + 0.0042232 * (idade * estatura);
}

export function maturityOffset(m: MedidasMaturacao, equacao: Equacao): number {
  return equacao === "mirwald_2002" ? offsetMirwald(m) : offsetMoore(m);
}

/** Idade estimada do pico de velocidade de crescimento (APHV) = idade − offset. */
export function idadePhv(idade: number, offset: number): number {
  return idade - offset;
}

export type FaseMaturacional = "pre_phv" | "circa_phv" | "pos_phv";

export const ROTULO_FASE: Record<FaseMaturacional, string> = {
  pre_phv: "Pré-PHV",
  circa_phv: "Circa-PHV",
  pos_phv: "Pós-PHV",
};

/** Limiares em anos de offset. Configuráveis pelo treinador (padrão −1 / +1). */
export interface LimiaresFase {
  inicioCirca: number;
  fimCirca: number;
}
export const LIMIARES_PADRAO: LimiaresFase = { inicioCirca: -1, fimCirca: 1 };

export function classificarFase(offset: number, l: LimiaresFase = LIMIARES_PADRAO): FaseMaturacional {
  if (offset < l.inicioCirca) return "pre_phv";
  if (offset > l.fimCirca) return "pos_phv";
  return "circa_phv";
}

/**
 * Idade biológica = offset + idade média do PHV da população de referência.
 * O valor de referência é cadastrado pelo treinador com a citação; sem ele, null.
 */
export function idadeBiologica(offset: number, aphvReferencia: number | null | undefined): number | null {
  return aphvReferencia == null ? null : offset + aphvReferencia;
}

/** Velocidade de crescimento (cm/ano) entre duas medidas de estatura. */
export function velocidadeCrescimento(
  anterior: { data: string; estatura: number },
  atual: { data: string; estatura: number },
): { cmAno: number; intervaloDias: number; confiavel: boolean } | null {
  const dias = (Date.parse(`${atual.data}T00:00:00Z`) - Date.parse(`${anterior.data}T00:00:00Z`)) / 86_400_000;
  if (dias <= 0) return null;
  return {
    cmAno: (atual.estatura - anterior.estatura) / (dias / 365.25),
    intervaloDias: dias,
    // Intervalos curtos amplificam o erro de medida; abaixo de ~3 meses a taxa anual é pouco confiável
    confiavel: dias >= 90,
  };
}

/**
 * Khamis-Roche (1994): estatura adulta predita = β0 + β1·estatura + β2·massa + β3·estatura média dos pais.
 * O método original usa POLEGADAS e LIBRAS, com coeficientes por sexo e idade (semestral).
 * Os coeficientes NÃO estão embarcados: o treinador cadastra a tabela do artigo original.
 * TODO(fonte): confirmar no artigo se as estaturas dos pais precisam do ajuste de autorrelato
 * antes de entrar na equação, e documentar aqui.
 */
export interface CoeficientesKR {
  idade: number; // anos (ex.: 12, 12.5)
  intercepto: number;
  coefEstatura: number;
  coefMassa: number;
  coefEstaturaPais: number;
}

const CM_POR_POLEGADA = 2.54;
const LB_POR_KG = 2.2046226218;

export function preverEstaturaAdultaKR(
  dados: { idade: number; estatura: number; massa: number; estaturaMae: number; estaturaPai: number },
  tabela: CoeficientesKR[],
): { estaturaAdultaCm: number; percentualAtingido: number; idadeTabela: number } | { erro: string } {
  if (!tabela.length) return { erro: "Coeficientes de Khamis-Roche não cadastrados" };
  // Usa a linha de idade mais próxima (a tabela original é por semestre)
  const linha = tabela.reduce((a, b) => (Math.abs(b.idade - dados.idade) < Math.abs(a.idade - dados.idade) ? b : a));
  if (Math.abs(linha.idade - dados.idade) > 0.25 + 1e-9) {
    return { erro: "Idade fora da faixa da tabela de coeficientes cadastrada" };
  }
  const pol = (cm: number) => cm / CM_POR_POLEGADA;
  const mediaPais = (pol(dados.estaturaMae) + pol(dados.estaturaPai)) / 2;
  const predPol =
    linha.intercepto +
    linha.coefEstatura * pol(dados.estatura) +
    linha.coefMassa * dados.massa * LB_POR_KG +
    linha.coefEstaturaPais * mediaPais;
  const estaturaAdultaCm = predPol * CM_POR_POLEGADA;
  return { estaturaAdultaCm, percentualAtingido: (dados.estatura / estaturaAdultaCm) * 100, idadeTabela: linha.idade };
}
