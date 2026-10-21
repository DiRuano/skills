/**
 * Regras comerciais do Movimento Aplicado (ver docs/decisoes.md).
 * Valores monetários sempre em CENTAVOS (inteiros) para evitar erro de arredondamento.
 */

export type Periodicidade = "mensal" | "trimestral" | "semestral" | "anual";

export const MESES_DO_PLANO: Record<Periodicidade, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

/**
 * Parcelamento acompanha a duração do plano: mensal = só à vista (integral),
 * semestral até 6x, anual até 12x. Juros por conta do cliente (calculados pelo gateway).
 */
export function maxParcelas(periodicidade: Periodicidade): number {
  return MESES_DO_PLANO[periodicidade];
}

export function parcelasPermitidas(periodicidade: Periodicidade): number[] {
  return Array.from({ length: maxParcelas(periodicidade) }, (_, i) => i + 1);
}

export function validarParcelas(periodicidade: Periodicidade, parcelas: number): string | null {
  if (!Number.isInteger(parcelas) || parcelas < 1) return "Número de parcelas inválido";
  const max = maxParcelas(periodicidade);
  if (parcelas > max) {
    return max === 1
      ? "O plano mensal é pago à vista"
      : `O plano ${periodicidade} pode ser dividido em até ${max}x`;
  }
  return null;
}

/** Desconto para irmãos: 10% a partir do 2º filho com assinatura ativa do mesmo responsável. */
export const DESCONTO_IRMAOS = 0.1;

/**
 * Aplica o desconto de irmãos. O 1º filho (pela ordem de início da assinatura) paga cheio;
 * do 2º em diante, 10% de desconto. Recebe os valores na ordem de início.
 */
export function aplicarDescontoIrmaos(valoresCentavos: number[]): number[] {
  return valoresCentavos.map((v, i) => (i === 0 ? v : Math.round(v * (1 - DESCONTO_IRMAOS))));
}
