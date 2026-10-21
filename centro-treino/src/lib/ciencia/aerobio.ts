/**
 * Corrida de vai-e-vem de 20 m — VO2máx estimado.
 * Léger LA, Mercier D, Gadoury C, Lambert J. The multistage 20 metre shuttle run test
 * for aerobic fitness. J Sports Sci. 1988;6(2):93-101. doi:10.1080/02640418808729800
 *
 * Protocolo: início a 8,5 km/h e +0,5 km/h por estágio de 1 minuto → velocidade = 8 + 0,5·estágio.
 * Equação para 6–18 anos: VO2máx = 31,025 + 3,238·V − 3,248·I + 0,1536·I·V
 * (V = velocidade do último estágio em km/h; I = idade em anos).
 * ATENÇÃO: conferir com o artigo original (ver docs/decisoes.md).
 */
export const FONTE_LEGER_1988 =
  "Léger LA, Mercier D, Gadoury C, Lambert J. The multistage 20 metre shuttle run test for aerobic fitness. J Sports Sci. 1988;6(2):93-101. doi:10.1080/02640418808729800";

export function velocidadeDoEstagio(estagio: number): number {
  return 8 + 0.5 * estagio;
}

/** Retorna null fora de 6–18 anos (faixa da equação infantojuvenil). */
export function vo2maxLeger(estagio: number, idadeAnos: number): number | null {
  if (!(estagio > 0) || idadeAnos < 6 || idadeAnos >= 19) return null;
  // O artigo usa a idade em anos inteiros
  const i = Math.floor(idadeAnos);
  const v = velocidadeDoEstagio(estagio);
  return 31.025 + 3.238 * v - 3.248 * i + 0.1536 * i * v;
}
