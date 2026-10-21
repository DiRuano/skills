"use server";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";
import { cifrar } from "@/lib/cripto";
import { ehMenor } from "@/lib/idade";
import { obterOuConvidarUsuario } from "@/lib/convites";
import { errosPorCampo, esquemaNovoAluno } from "@/lib/validacao";

export type EstadoNovoAluno = { erros?: Record<string, string>; valores?: Record<string, string> };

export async function criarAluno(_: EstadoNovoAluno, form: FormData): Promise<EstadoNovoAluno> {
  await exigirPapel("admin");
  const valores = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const r = esquemaNovoAluno.safeParse(valores);
  if (!r.success) return { erros: errosPorCampo(r.error), valores };
  const d = r.data;

  // 1) Responsável (obrigatório para menores): encontra ou convida
  let responsavelId: string | null = null;
  if (d.responsavel_email) {
    const resp = await obterOuConvidarUsuario(d.responsavel_email, d.responsavel_nome ?? "", "responsavel");
    if ("erro" in resp) return { erros: { responsavel_email: resp.erro }, valores };
    responsavelId = resp.id;
  }

  // 2) Conta do próprio aluno (opcional). Menor só ganha login após o
  //    consentimento do responsável — isso é feito depois, na ficha.
  let usuarioId: string | null = null;
  if (d.aluno_email && !ehMenor(d.data_nascimento)) {
    const conta = await obterOuConvidarUsuario(d.aluno_email, d.nome, "aluno");
    if ("erro" in conta) return { erros: { aluno_email: conta.erro }, valores };
    usuarioId = conta.id;
  }

  // 3) Aluno + vínculo + saúde (cifrada) numa transação, com a RLS do treinador
  const supabase = await clienteServidor();
  const { data: alunoId, error } = await supabase.rpc("criar_aluno", {
    p_nome: d.nome,
    p_data_nascimento: d.data_nascimento,
    p_sexo: d.sexo_biologico,
    p_modalidade: d.modalidade ?? null,
    p_lado: d.lado_dominante ?? null,
    p_responsavel_id: responsavelId,
    p_parentesco: d.responsavel_parentesco ?? null,
    p_usuario_id: usuarioId,
    p_lesoes_cifrado: cifrar(d.historico_lesoes),
    p_observacoes_cifrado: cifrar(d.observacoes),
  });
  if (error || !alunoId) {
    return { erros: { _form: "Não foi possível salvar o aluno. Tente novamente." }, valores };
  }
  redirect(`/treinador/alunos/${alunoId}?criado=1`);
}
