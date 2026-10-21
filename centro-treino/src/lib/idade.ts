/** Utilitários de data/idade no fuso America/Sao_Paulo. */

export const FUSO = "America/Sao_Paulo";

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function hojeSP(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/** Idade em anos completos, comparando datas no formato AAAA-MM-DD. */
export function idadeAnos(nascimento: string, referencia: string = hojeSP()): number {
  const [an, mn, dn] = nascimento.split("-").map(Number);
  const [ar, mr, dr] = referencia.split("-").map(Number);
  let idade = ar - an;
  if (mr < mn || (mr === mn && dr < dn)) idade -= 1;
  return idade;
}

/**
 * Idade decimal (anos), usada nas equações de maturação da Fase 2.
 * Usa a diferença real em dias / 365,25.
 */
export function idadeDecimal(nascimento: string, referencia: string = hojeSP()): number {
  const ms = Date.parse(`${referencia}T00:00:00Z`) - Date.parse(`${nascimento}T00:00:00Z`);
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

export function ehMenor(nascimento: string, referencia?: string): boolean {
  return idadeAnos(nascimento, referencia) < 18;
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
