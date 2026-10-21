// Dados FICTÍCIOS para testes de renderização. Percentis e tabelas aqui NÃO são normas reais.
import type { ResumoAvaliacao, Teste } from "@/lib/avaliacao";

const teste = (id: string, nome: string, unidade: string, maior_melhor = true, ordem = 1): Teste => ({
  id, codigo: id, nome, categoria: "x", unidade, tipo: "numerico", maior_melhor, tentativas: 2, criterio: "melhor",
  por_lado: false, criterios: null, protocolo: null, padrao: true, ativo: true, ordem, tabela_padrao_id: "tab",
});

const tabela = {
  id: "tab", teste_id: "x", nome: "Tabela FICTÍCIA", populacao: "fictícia", tipo: "percentil" as const,
  citacao: "Referência fictícia para teste de layout, 2026.", doi_url: null, ano: 2026, nivel_confianca: "local" as const,
};

const faixa = { sexo: "M" as const, idade_min: 12, idade_max: 13, tipo: "percentil" as const, valores: {} };

export const resumoFicticio: ResumoAvaliacao = {
  avaliacao: { id: "av", aluno_id: "al", data: "2026-10-20", massa_kg: 45, estatura_cm: 155, altura_sentado_cm: 80, envergadura_cm: null, observacoes: null, publicada_em: null },
  aluno: { id: "al", nome: "Aluno Fictício da Silva", data_nascimento: "2014-03-10", sexo_biologico: "M", modalidade: "Futebol", lado_dominante: "direito", foto_path: null, usuario_id: null, status: "ativo", criado_em: "2026-01-01" },
  idade: 12.61,
  imc: { valor: 18.73, z: 0.12, classificacao: "Eutrofia" },
  comprimentoPerna: 75,
  maturacao: { offsets: { mirwald_2002: -0.9, moore_2015: -0.85 }, equacao: "moore_2015", offset: -0.85, aphv: 13.46, fase: "circa_phv", idadeBiologica: 12.3 },
  crescimento: { cmAno: 7.4, intervaloDias: 180, confiavel: true },
  estaturaAdulta: { erro: "Coeficientes de Khamis-Roche não cadastrados" },
  resultados: [
    { teste: teste("cmj", "Salto vertical (CMJ)", "cm", true, 1), lado: "unico", valor: 31.5, tentativas: [30, 31.5], criterios: null, tabela, cronologica: { tipo: "percentil", percentil: 62, limitado: null, faixa }, biologica: { tipo: "percentil", percentil: 71, limitado: null, faixa }, mediaTurma: { media: 29.8, n: 6 }, vo2max: null },
    { teste: teste("sh", "Salto horizontal", "cm", true, 2), lado: "unico", valor: 172, tentativas: [165, 172], criterios: null, tabela, cronologica: { tipo: "percentil", percentil: 45, limitado: null, faixa }, biologica: { tipo: "percentil", percentil: 55, limitado: null, faixa }, mediaTurma: null, vo2max: null },
    { teste: teste("s20", "Sprint 20 m", "s", false, 3), lado: "unico", valor: 3.62, tentativas: [3.7, 3.62], criterios: null, tabela, cronologica: { tipo: "percentil", percentil: 30, limitado: null, faixa }, biologica: { tipo: "percentil", percentil: 41, limitado: null, faixa }, mediaTurma: null, vo2max: null },
    { teste: teste("vv", "Vai-e-vem 20 m", "estágio", true, 4), lado: "unico", valor: 6, tentativas: [6], criterios: null, tabela, cronologica: { tipo: "percentil", percentil: 80, limitado: null, faixa }, biologica: null, mediaTurma: null, vo2max: 47.9 },
    { teste: teste("sa", "Sentar e alcançar", "cm", true, 5), lado: "unico", valor: 24, tentativas: [23, 24], criterios: null, tabela: null, cronologica: { tipo: "sem_referencia" }, biologica: { tipo: "sem_referencia" }, mediaTurma: null, vo2max: null },
  ],
  parametros: { equacao: "moore_2015", limiares: { inicioCirca: -1, fimCirca: 1 }, aphv: { M: 13.15, F: null }, aphvCitacao: "Citação fictícia de APHV de referência.", krCitacao: null },
  fontes: ["Referência fictícia para teste de layout, 2026.", "Moore SA, et al. (2015) — exemplo."],
};
