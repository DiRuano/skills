"use server";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosPorCampo, esquemaSolicitacaoExclusao } from "@/lib/validacao";

export type EstadoExclusao = { erros?: Record<string, string>; ok?: boolean };

/** Pedido de exclusão (LGPD art. 18, VI). A RLS só aceita para filho vinculado. */
export async function solicitarExclusao(_: EstadoExclusao, form: FormData): Promise<EstadoExclusao> {
  const r = esquemaSolicitacaoExclusao.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error) };

  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: aluno } = await supabase.from("alunos").select("nome").eq("id", r.data.aluno_id).maybeSingle();
  if (!user || !aluno) return { erros: { _form: "Aluno não encontrado" } };

  const { error } = await supabase.from("solicitacoes_exclusao").insert({
    aluno_id: r.data.aluno_id,
    aluno_nome: aluno.nome,
    solicitante_id: user.id,
    motivo: r.data.motivo ?? null,
  });
  if (error) return { erros: { _form: "Não foi possível registrar o pedido" } };
  revalidatePath("/responsavel/privacidade");
  return { ok: true };
}
