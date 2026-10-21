"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Conclui um pedido de exclusão: apaga fotos e o aluno (cascata apaga
 * vínculos, saúde e consentimentos). O pedido fica guardado com o nome,
 * como prova de atendimento ao titular.
 */
export async function concluirExclusao(solicitacaoId: string): Promise<void> {
  await exigirPapel("admin");
  if (!z.string().uuid().safeParse(solicitacaoId).success) return;
  const supabase = await clienteServidor();
  const { data: s } = await supabase.from("solicitacoes_exclusao").select("aluno_id").eq("id", solicitacaoId).single();
  if (!s) return;

  if (s.aluno_id) {
    const { data: arquivos } = await supabase.storage.from("fotos-alunos").list(s.aluno_id);
    if (arquivos?.length) {
      await supabase.storage.from("fotos-alunos").remove(arquivos.map((a) => `${s.aluno_id}/${a.name}`));
    }
    const { error } = await supabase.from("alunos").delete().eq("id", s.aluno_id);
    if (error) return;
  }
  await supabase
    .from("solicitacoes_exclusao")
    .update({ status: "concluida", concluido_em: new Date().toISOString(), resposta: "Dados excluídos" })
    .eq("id", solicitacaoId);
  revalidatePath("/treinador", "layout");
}

export async function recusarExclusao(solicitacaoId: string, form: FormData): Promise<void> {
  await exigirPapel("admin");
  const resposta = String(form.get("resposta") ?? "").trim();
  if (!resposta) return;
  const supabase = await clienteServidor();
  await supabase
    .from("solicitacoes_exclusao")
    .update({ status: "recusada", resposta, concluido_em: new Date().toISOString() })
    .eq("id", solicitacaoId);
  revalidatePath("/treinador/solicitacoes");
}
