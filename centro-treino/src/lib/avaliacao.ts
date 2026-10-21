import "server-only";
import { clienteServidor } from "./supabase/servidor";
import { idadeDecimal } from "./idade";
import type { Aluno } from "./tipos";
import { calcularImc, classificarZImc, idadeEmMeses, zImcPorIdade, FONTE_OMS_2007 } from "./ciencia/imc";
import {
  classificarFase,
  comprimentoPerna,
  FONTE_KHAMIS_ROCHE_1994,
  FONTE_MIRWALD_2002,
  FONTE_MOORE_2015,
  idadeBiologica,
  idadePhv,
  LIMIARES_PADRAO,
  maturityOffset,
  NOME_EQUACAO,
  preverEstaturaAdultaKR,
  velocidadeCrescimento,
  type CoeficientesKR,
  type Equacao,
  type FaseMaturacional,
  type LimiaresFase,
} from "./ciencia/maturacao";
import { comparar, type Comparacao, type Faixa } from "./ciencia/referencia";
import { FONTE_LEGER_1988, vo2maxLeger } from "./ciencia/aerobio";

// ---------------------------------------------------------------------
// Tipos das linhas
// ---------------------------------------------------------------------
export interface Teste {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string;
  unidade: string;
  tipo: "numerico" | "criterios";
  maior_melhor: boolean;
  tentativas: number;
  criterio: "melhor" | "media";
  por_lado: boolean;
  criterios: { nome: string; max: number }[] | null;
  protocolo: string | null;
  padrao: boolean;
  ativo: boolean;
  ordem: number;
  tabela_padrao_id: string | null;
}

export interface TabelaReferencia {
  id: string;
  teste_id: string;
  nome: string;
  populacao: string;
  tipo: "percentil" | "zona";
  citacao: string;
  doi_url: string | null;
  ano: number | null;
  nivel_confianca: "meta_analise" | "populacional" | "local";
}

export interface AvaliacaoLinha {
  id: string;
  aluno_id: string;
  data: string;
  massa_kg: number | null;
  estatura_cm: number | null;
  altura_sentado_cm: number | null;
  envergadura_cm: number | null;
  observacoes: string | null;
  publicada_em: string | null;
}

export interface ResultadoLinha {
  id: string;
  avaliacao_id: string;
  teste_id: string;
  lado: "unico" | "D" | "E";
  tentativas: number[];
  valor: number;
  criterios: Record<string, number> | null;
}

export const ROTULO_CONFIANCA = {
  meta_analise: "Meta-análise",
  populacional: "Grande amostra populacional",
  local: "Amostra local",
} as const;

export const ROTULO_LADO = { unico: "", D: "direito", E: "esquerdo" } as const;

/** Citação curta para exibir embaixo de cada comparação. */
export function citacaoCurta(t: TabelaReferencia) {
  return `${t.citacao}${t.doi_url ? ` ${t.doi_url}` : ""} — ${ROTULO_CONFIANCA[t.nivel_confianca]}`;
}

// ---------------------------------------------------------------------
// Parâmetros
// ---------------------------------------------------------------------
export interface Parametros {
  equacao: Equacao;
  limiares: LimiaresFase;
  aphv: { M: number | null; F: number | null };
  aphvCitacao: string | null;
  krCitacao: string | null;
}

export async function carregarParametros(): Promise<Parametros> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("parametros").select("chave, valor, citacao");
  const p = new Map((data ?? []).map((l) => [l.chave as string, l]));
  const eq = p.get("equacao_maturacao")?.valor;
  return {
    equacao: eq === "mirwald_2002" ? "mirwald_2002" : "moore_2015",
    limiares: { ...LIMIARES_PADRAO, ...(p.get("limiares_fase")?.valor ?? {}) },
    aphv: { M: null, F: null, ...(p.get("aphv_referencia")?.valor ?? {}) },
    aphvCitacao: p.get("aphv_referencia")?.citacao ?? null,
    krCitacao: p.get("khamis_roche")?.citacao ?? null,
  };
}

// ---------------------------------------------------------------------
// Resumo de uma avaliação
// ---------------------------------------------------------------------
export interface ResultadoResumo {
  teste: Teste;
  lado: "unico" | "D" | "E";
  valor: number;
  tentativas: number[];
  criterios: Record<string, number> | null;
  tabela: TabelaReferencia | null;
  cronologica: Comparacao;
  biologica: Comparacao | null; // null = sem idade biológica disponível
  mediaTurma: { media: number; n: number } | null;
  vo2max: number | null;
}

export interface MaturacaoResumo {
  offsets: Record<Equacao, number>;
  equacao: Equacao;
  offset: number;
  aphv: number;
  fase: FaseMaturacional;
  idadeBiologica: number | null;
}

export interface ResumoAvaliacao {
  avaliacao: AvaliacaoLinha;
  aluno: Aluno;
  idade: number;
  imc: { valor: number; z: number | null; classificacao: string | null } | null;
  comprimentoPerna: number | null;
  maturacao: MaturacaoResumo | null;
  crescimento: ReturnType<typeof velocidadeCrescimento>;
  estaturaAdulta: ReturnType<typeof preverEstaturaAdultaKR> | null;
  resultados: ResultadoResumo[];
  parametros: Parametros;
  fontes: string[];
}

export async function resumirAvaliacao(avaliacaoId: string): Promise<ResumoAvaliacao | null> {
  const supabase = await clienteServidor();
  const { data: avaliacao } = await supabase
    .from("avaliacoes")
    .select("*")
    .eq("id", avaliacaoId)
    .maybeSingle<AvaliacaoLinha>();
  if (!avaliacao) return null;

  const [{ data: aluno }, { data: resultados }, { data: testes }, { data: anterior }, { data: familia }, parametros] =
    await Promise.all([
      supabase.from("alunos").select("*").eq("id", avaliacao.aluno_id).single<Aluno>(),
      supabase.from("resultados_testes").select("*").eq("avaliacao_id", avaliacaoId),
      supabase.from("testes").select("*").order("ordem"),
      supabase
        .from("avaliacoes")
        .select("data, estatura_cm")
        .eq("aluno_id", avaliacao.aluno_id)
        .lt("data", avaliacao.data)
        .not("estatura_cm", "is", null)
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("alunos_familia").select("*").eq("aluno_id", avaliacao.aluno_id).maybeSingle(),
      carregarParametros(),
    ]);
  if (!aluno) return null;

  const sexo = aluno.sexo_biologico;
  const idade = idadeDecimal(aluno.data_nascimento, avaliacao.data);
  const fontes = new Set<string>();

  // Antropometria
  const massa = avaliacao.massa_kg != null ? Number(avaliacao.massa_kg) : null;
  const estatura = avaliacao.estatura_cm != null ? Number(avaliacao.estatura_cm) : null;
  const sentado = avaliacao.altura_sentado_cm != null ? Number(avaliacao.altura_sentado_cm) : null;

  let imc: ResumoAvaliacao["imc"] = null;
  if (massa && estatura) {
    const valor = calcularImc(massa, estatura);
    const z = zImcPorIdade(sexo, idadeEmMeses(aluno.data_nascimento, avaliacao.data), valor);
    imc = { valor, z, classificacao: z == null ? null : classificarZImc(z) };
    if (z != null) fontes.add(FONTE_OMS_2007);
  }

  // Maturação: calcula as duas equações e destaca a escolhida
  let maturacao: MaturacaoResumo | null = null;
  if (massa && estatura && sentado) {
    const medidas = { sexo, idade, estatura, alturaSentado: sentado, massa };
    const offsets = {
      mirwald_2002: maturityOffset(medidas, "mirwald_2002"),
      moore_2015: maturityOffset(medidas, "moore_2015"),
    };
    const offset = offsets[parametros.equacao];
    maturacao = {
      offsets,
      equacao: parametros.equacao,
      offset,
      aphv: idadePhv(idade, offset),
      fase: classificarFase(offset, parametros.limiares),
      idadeBiologica: idadeBiologica(offset, parametros.aphv[sexo]),
    };
    fontes.add(FONTE_MIRWALD_2002);
    fontes.add(FONTE_MOORE_2015);
    if (maturacao.idadeBiologica != null && parametros.aphvCitacao) fontes.add(parametros.aphvCitacao);
  }

  const crescimento =
    anterior && estatura
      ? velocidadeCrescimento(
          { data: anterior.data, estatura: Number(anterior.estatura_cm) },
          { data: avaliacao.data, estatura },
        )
      : null;

  // Khamis-Roche (só com estatura dos pais e coeficientes cadastrados)
  let estaturaAdulta: ResumoAvaliacao["estaturaAdulta"] = null;
  if (familia?.estatura_mae_cm && familia?.estatura_pai_cm && massa && estatura) {
    const { data: coef } = await supabase.from("khamis_roche_coeficientes").select("*").eq("sexo", sexo);
    const tabela: CoeficientesKR[] = (coef ?? []).map((c) => ({
      idade: Number(c.idade),
      intercepto: c.intercepto,
      coefEstatura: c.coef_estatura,
      coefMassa: c.coef_massa,
      coefEstaturaPais: c.coef_estatura_pais,
    }));
    estaturaAdulta = preverEstaturaAdultaKR(
      { idade, estatura, massa, estaturaMae: Number(familia.estatura_mae_cm), estaturaPai: Number(familia.estatura_pai_cm) },
      tabela,
    );
    if (!("erro" in estaturaAdulta)) fontes.add(parametros.krCitacao ?? FONTE_KHAMIS_ROCHE_1994);
  }

  // Resultados × tabelas de referência padrão
  const mapaTestes = new Map((testes as Teste[] | null)?.map((t) => [t.id, t]));
  const linhas = ((resultados ?? []) as ResultadoLinha[]).filter((r) => mapaTestes.has(r.teste_id));
  const idsTabelas = [...new Set(linhas.map((r) => mapaTestes.get(r.teste_id)!.tabela_padrao_id).filter(Boolean))] as string[];
  const [{ data: tabelas }, { data: faixas }] = idsTabelas.length
    ? await Promise.all([
        supabase.from("tabelas_referencia").select("*").in("id", idsTabelas),
        supabase.from("faixas_referencia").select("*").in("tabela_id", idsTabelas),
      ])
    : [{ data: [] }, { data: [] }];
  const mapaTabelas = new Map((tabelas as TabelaReferencia[] | null)?.map((t) => [t.id, t]));
  const faixasPorTabela = new Map<string, Faixa[]>();
  for (const f of (faixas ?? []) as (Faixa & { tabela_id: string; idade_min: number; idade_max: number })[]) {
    const tab = mapaTabelas.get(f.tabela_id);
    if (!tab) continue;
    const lista = faixasPorTabela.get(f.tabela_id) ?? [];
    lista.push({ ...f, idade_min: Number(f.idade_min), idade_max: Number(f.idade_max), tipo: tab.tipo } as Faixa);
    faixasPorTabela.set(f.tabela_id, lista);
  }

  const idadeInteira = Math.floor(idade);
  const resumoResultados: ResultadoResumo[] = await Promise.all(
    linhas.map(async (r) => {
      const teste = mapaTestes.get(r.teste_id)!;
      const valor = Number(r.valor);
      const tabela = teste.tabela_padrao_id ? mapaTabelas.get(teste.tabela_padrao_id) ?? null : null;
      const fx = tabela ? faixasPorTabela.get(tabela.id) ?? [] : [];
      const cronologica: Comparacao = comparar(valor, fx, sexo, idade, teste.maior_melhor);
      const biologica =
        maturacao?.idadeBiologica != null ? comparar(valor, fx, sexo, maturacao.idadeBiologica, teste.maior_melhor) : null;
      if (tabela && (cronologica.tipo !== "sem_referencia" || biologica?.tipo !== "sem_referencia")) {
        fontes.add(`${tabela.citacao}${tabela.doi_url ? ` ${tabela.doi_url}` : ""}`);
      }
      const { data: mt } = await supabase.rpc("media_turma", {
        p_teste_id: teste.id,
        p_sexo: sexo,
        p_idade: idadeInteira,
        p_lado: r.lado,
      });
      const media = Array.isArray(mt) && mt[0] ? { media: Number(mt[0].media), n: mt[0].n } : null;
      const vo2max = teste.codigo === "vai_vem_20m" ? vo2maxLeger(valor, idade) : null;
      if (vo2max != null) fontes.add(FONTE_LEGER_1988);
      return {
        teste,
        lado: r.lado,
        valor,
        tentativas: (r.tentativas ?? []).map(Number),
        criterios: r.criterios,
        tabela,
        cronologica,
        biologica,
        mediaTurma: media,
        vo2max,
      };
    }),
  );
  resumoResultados.sort((a, b) => a.teste.ordem - b.teste.ordem || a.lado.localeCompare(b.lado));

  return {
    avaliacao,
    aluno,
    idade,
    imc,
    comprimentoPerna: estatura && sentado ? comprimentoPerna(estatura, sentado) : null,
    maturacao,
    crescimento,
    estaturaAdulta,
    resultados: resumoResultados,
    parametros,
    fontes: [...fontes],
  };
}

// ---------------------------------------------------------------------
// Histórico (linha do tempo por teste)
// ---------------------------------------------------------------------
export interface PontoHistorico {
  data: string;
  valor: number;
}

export async function historicoAluno(alunoId: string) {
  const supabase = await clienteServidor();
  const { data: avaliacoes } = await supabase
    .from("avaliacoes")
    .select("id, data, massa_kg, estatura_cm, publicada_em")
    .eq("aluno_id", alunoId)
    .order("data");
  const ids = (avaliacoes ?? []).map((a) => a.id);
  const { data: resultados } = ids.length
    ? await supabase.from("resultados_testes").select("avaliacao_id, teste_id, lado, valor").in("avaliacao_id", ids)
    : { data: [] };
  const dataPorAvaliacao = new Map((avaliacoes ?? []).map((a) => [a.id, a.data as string]));
  const porTeste = new Map<string, PontoHistorico[]>(); // chave: teste_id|lado
  for (const r of resultados ?? []) {
    const chave = `${r.teste_id}|${r.lado}`;
    const lista = porTeste.get(chave) ?? [];
    lista.push({ data: dataPorAvaliacao.get(r.avaliacao_id)!, valor: Number(r.valor) });
    porTeste.set(chave, lista);
  }
  for (const l of porTeste.values()) l.sort((a, b) => a.data.localeCompare(b.data));
  return { avaliacoes: avaliacoes ?? [], porTeste };
}

export { NOME_EQUACAO };
