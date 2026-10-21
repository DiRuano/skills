import "server-only";
import { clienteServidor } from "./supabase/servidor";
import { idadeAnos } from "./idade";
import type { Aluno } from "./tipos";

export type Qualidade = "responsavel" | "titular";

/**
 * Decide se o usuário logado pode consentir em nome do aluno e em que
 * qualidade. Regra: menor → só responsável vinculado; maior → o próprio
 * titular (ou o responsável vinculado, se ainda não houver conta própria).
 * A leitura passa pela RLS, então só retorna aluno visível ao usuário.
 */
export async function autorizacaoConsentimento(
  alunoId: string,
): Promise<{ aluno: Aluno; usuarioId: string; qualidade: Qualidade } | null> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: aluno } = await supabase.from("alunos").select("*").eq("id", alunoId).maybeSingle<Aluno>();
  if (!aluno) return null;

  const menor = idadeAnos(aluno.data_nascimento) < 18;
  if (!menor && aluno.usuario_id === user.id) return { aluno, usuarioId: user.id, qualidade: "titular" };

  const { data: vinculo } = await supabase
    .from("responsaveis_alunos")
    .select("aluno_id")
    .eq("aluno_id", alunoId)
    .eq("responsavel_id", user.id)
    .maybeSingle();
  if (vinculo && (menor || !aluno.usuario_id)) return { aluno, usuarioId: user.id, qualidade: "responsavel" };
  return null;
}
