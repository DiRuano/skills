import { LMS_IMC_FEMININO, LMS_IMC_MASCULINO, type LinhaLMS } from "./oms-imc-lms";

/**
 * IMC e escore-z de IMC por idade — Referência OMS 2007 (5–19 anos).
 *
 * Reproduz o cálculo do pacote oficial da OMS (anthroplus/anthro):
 *  - idade em meses = dias / 30,4375;
 *  - L, M e S interpolados linearmente entre o mês inteiro anterior e o seguinte;
 *  - z = ((IMC/M)^L − 1) / (L·S), com o ajuste "restrito" da OMS para |z| > 3,
 *    que usa a distância entre ±2 e ±3 DP para não distorcer os extremos.
 * Validado nos testes contra z-scores calculados pela própria OMS.
 */

export const FONTE_OMS_2007 =
  "de Onis M, Onyango AW, Borghi E, Siyam A, Nishida C, Siekmann J. Development of a WHO growth reference for school-aged children and adolescents. Bull World Health Organ. 2007;85(9):660-7. doi:10.2471/BLT.07.043497";

export const DIAS_POR_MES = 30.4375;
export const IDADE_MIN_MESES = 60;
export const IDADE_MAX_MESES = 229; // exclusivo, como no pacote da OMS

export function calcularImc(massaKg: number, estaturaCm: number): number {
  const m = estaturaCm / 100;
  return massaKg / (m * m);
}

export function idadeEmMeses(nascimento: string, dataAvaliacao: string): number {
  const dias = (Date.parse(`${dataAvaliacao}T00:00:00Z`) - Date.parse(`${nascimento}T00:00:00Z`)) / 86_400_000;
  return dias / DIAS_POR_MES;
}

function lmsNaIdade(sexo: "M" | "F", idadeMeses: number): { l: number; m: number; s: number } | null {
  if (!(idadeMeses >= IDADE_MIN_MESES && idadeMeses < IDADE_MAX_MESES)) return null;
  const tabela = sexo === "M" ? LMS_IMC_MASCULINO : LMS_IMC_FEMININO;
  const baixo = Math.trunc(idadeMeses);
  const fracao = idadeMeses - baixo;
  const linha = (mes: number): LinhaLMS | undefined => tabela[mes - IDADE_MIN_MESES];
  const a = linha(baixo);
  if (!a) return null;
  const b = fracao > 0 ? linha(baixo + 1) : a;
  if (!b) return null;
  const interp = (i: 1 | 2 | 3) => a[i] + fracao * (b[i] - a[i]);
  return { l: interp(1), m: interp(2), s: interp(3) };
}

/** Escore-z pelo método LMS com o ajuste da OMS para valores além de ±3 DP. */
export function zLmsAjustado(y: number, l: number, m: number, s: number): number {
  const z = (Math.pow(y / m, l) - 1) / (s * l);
  const valorNoDp = (dp: number) => m * Math.pow(1 + l * s * dp, 1 / l);
  if (z > 3) {
    const dp3 = valorNoDp(3);
    return 3 + (y - dp3) / (dp3 - valorNoDp(2));
  }
  if (z < -3) {
    const dp3neg = valorNoDp(-3);
    return -3 + (y - dp3neg) / (valorNoDp(-2) - dp3neg);
  }
  return z;
}

/** Escore-z de IMC por idade. Retorna null fora da faixa 5–19 anos. */
export function zImcPorIdade(sexo: "M" | "F", idadeMeses: number, imc: number): number | null {
  const p = lmsNaIdade(sexo, idadeMeses);
  if (!p || !(imc > 0)) return null;
  return zLmsAjustado(imc, p.l, p.m, p.s);
}

/**
 * Classificação de IMC por idade com os pontos de corte da OMS 2007 para 5–19 anos
 * (de Onis et al., 2007): magreza acentuada < −3; magreza < −2; eutrofia até +1;
 * sobrepeso > +1; obesidade > +2.
 */
export function classificarZImc(z: number): string {
  if (z < -3) return "Magreza acentuada";
  if (z < -2) return "Magreza";
  if (z <= 1) return "Eutrofia";
  if (z <= 2) return "Sobrepeso";
  return "Obesidade";
}
