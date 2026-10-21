"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";
import { importarCsv } from "@/lib/ciencia/importacao";

export type EstadoTabela = { erros?: string[] };

const esquema = z.object({
  teste_id: z.string().uuid("Escolha o teste"),
  nome: z.string().trim().min(2, "Dê um nome à tabela"),
  populacao: z.string().trim().min(2, "Informe a população (ex.: europeia, brasileira)"),
  tipo: z.enum(["percentil", "zona"]),
  citacao: z.string().trim().min(10, "A citação completa é obrigatória"),
  doi_url: z.string().trim().optional(),
  ano: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal("").transform(() => undefined)),
  nivel_confianca: z.enum(["meta_analise", "populacional", "local"]),
  observacoes: z.string().trim().max(2000).optional(),
  usar_como_padrao: z.preprocess((v) => v === "on", z.boolean()),
});

export async function criarTabela(_: EstadoTabela, form: FormData): Promise<EstadoTabela> {
  const perfil = await exigirPapel("admin");
  const r = esquema.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: r.error.issues.map((i) => i.message) };

  // CSV por arquivo ou colado no campo de texto
  const arquivo = form.get("arquivo");
  let texto = String(form.get("csv_texto") ?? "");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > 512 * 1024) return { erros: ["Arquivo maior que 512 KB"] };
    texto = await arquivo.text();
  }
  if (!texto.trim()) return { erros: ["Envie o arquivo CSV ou cole o conteúdo"] };
  const { faixas, erros } = importarCsv(texto, r.data.tipo);
  if (erros.length) return { erros };
  if (!faixas.length) return { erros: ["Nenhuma faixa válida encontrada no CSV"] };

  const { usar_como_padrao, ...meta } = r.data;
  const supabase = await clienteServidor();
  const { data: tabela, error } = await supabase
    .from("tabelas_referencia")
    .insert({ ...meta, doi_url: meta.doi_url || null, observacoes: meta.observacoes || null, criado_por: perfil.id })
    .select("id")
    .single();
  if (error || !tabela) return { erros: ["Não foi possível salvar a tabela"] };

  const { error: e2 } = await supabase.from("faixas_referencia").insert(
    faixas.map((f) => ({ tabela_id: tabela.id, sexo: f.sexo, idade_min: f.idade_min, idade_max: f.idade_max, valores: f.valores })),
  );
  if (e2) {
    await supabase.from("tabelas_referencia").delete().eq("id", tabela.id);
    return { erros: ["Não foi possível salvar as faixas (verifique sobreposição de idades)"] };
  }
  if (usar_como_padrao) {
    await supabase.from("testes").update({ tabela_padrao_id: tabela.id }).eq("id", meta.teste_id);
  }
  redirect(`/treinador/referencias/${tabela.id}`);
}

export async function definirPadrao(tabelaId: string, testeId: string) {
  await exigirPapel("admin");
  const supabase = await clienteServidor();
  await supabase.from("testes").update({ tabela_padrao_id: tabelaId }).eq("id", testeId);
  revalidatePath(`/treinador/referencias/${tabelaId}`);
}

export async function excluirTabela(tabelaId: string) {
  await exigirPapel("admin");
  const supabase = await clienteServidor();
  await supabase.from("tabelas_referencia").delete().eq("id", tabelaId);
  redirect("/treinador/referencias");
}
