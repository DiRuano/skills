"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteAdmin } from "@/lib/supabase/admin";
import { dadosRequisicao } from "@/lib/auth";
import { autorizacaoConsentimento } from "@/lib/consentimento";
import { errosPorCampo, esquemaConsentimento } from "@/lib/validacao";
import type { TipoTermo } from "@/lib/tipos";

export type EstadoConsentimento = { erros?: Record<string, string> };

/**
 * Registra o consentimento. A gravação é feita pelo servidor (chave de
 * serviço) para capturar IP e user-agent de forma confiável; antes disso
 * a permissão é verificada com a sessão do usuário (RLS).
 */
export async function registrarConsentimento(
  _: EstadoConsentimento,
  form: FormData,
): Promise<EstadoConsentimento> {
  const r = esquemaConsentimento.safeParse(Object.fromEntries(form));
  if (!r.success) return { erros: errosPorCampo(r.error) };

  const auth = await autorizacaoConsentimento(r.data.aluno_id);
  if (!auth) return { erros: { _form: "Você não tem permissão para consentir por este aluno." } };

  const admin = clienteAdmin();
  const { data: termos } = await admin.from("termos").select("id, tipo, hash_conteudo").eq("vigente", true);
  const porTipo = new Map((termos ?? []).map((t) => [t.tipo as TipoTermo, t]));

  // O hash enviado pelo formulário prova que a pessoa viu a versão vigente
  for (const tipo of ["dados_menor", "imagem", "termos_uso", "privacidade"] as const) {
    if (form.get(`hash_${tipo}`) !== porTipo.get(tipo)?.hash_conteudo) {
      return { erros: { _form: "Os termos foram atualizados enquanto você lia. Recarregue a página." } };
    }
  }

  const { ip, userAgent } = await dadosRequisicao();
  const linha = (tipo: TipoTermo, concedido: boolean) => ({
    aluno_id: auth.aluno.id,
    concedido_por: auth.usuarioId,
    qualidade: auth.qualidade,
    termo_id: porTipo.get(tipo)!.id,
    concedido,
    ip,
    user_agent: userAgent,
  });

  const { error } = await admin.from("consentimentos").insert([
    linha("termos_uso", true),
    linha("privacidade", true),
    linha("dados_menor", true),
    linha("imagem", r.data.imagem === "sim"),
  ]);
  if (error) return { erros: { _form: "Não foi possível registrar. Tente novamente." } };

  revalidatePath("/", "layout");
  redirect(auth.qualidade === "titular" ? "/aluno" : "/responsavel?consentido=1");
}

/** Revoga (ou volta a conceder) um consentimento específico. */
export async function alterarConsentimento(
  alunoId: string,
  tipo: "dados_menor" | "imagem",
  concedido: boolean,
): Promise<void> {
  const auth = await autorizacaoConsentimento(alunoId);
  if (!auth) return;
  const admin = clienteAdmin();
  const { data: termo } = await admin.from("termos").select("id").eq("tipo", tipo).eq("vigente", true).single();
  if (!termo) return;
  const { ip, userAgent } = await dadosRequisicao();
  await admin.from("consentimentos").insert({
    aluno_id: alunoId,
    concedido_por: auth.usuarioId,
    qualidade: auth.qualidade,
    termo_id: termo.id,
    concedido,
    ip,
    user_agent: userAgent,
  });

  // Revogar a imagem apaga a foto (conforme o termo)
  if (tipo === "imagem" && !concedido && auth.aluno.foto_path) {
    await admin.storage.from("fotos-alunos").remove([auth.aluno.foto_path]);
    await admin.from("alunos").update({ foto_path: null }).eq("id", alunoId);
  }
  revalidatePath("/", "layout");
}
