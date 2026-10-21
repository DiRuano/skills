"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { cifrar } from "@/lib/cripto";
import { obterOuConvidarUsuario } from "@/lib/convites";

export type Estado = { erro?: string; ok?: string };

const uuid = z.string().uuid();

/** Atualiza os dados de saúde (cifrados) e registra o acesso. */
export async function salvarSaude(alunoId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigirPapel("admin");
  if (!uuid.safeParse(alunoId).success) return { erro: "Aluno inválido" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("alunos_saude").upsert({
    aluno_id: alunoId,
    historico_lesoes_cifrado: cifrar(String(form.get("historico_lesoes") ?? "")),
    observacoes_cifrado: cifrar(String(form.get("observacoes") ?? "")),
    atualizado_por: (await supabase.auth.getUser()).data.user?.id,
  });
  if (error) return { erro: "Não foi possível salvar" };
  await supabase.rpc("registrar_acesso", { p_aluno_id: alunoId, p_recurso: "alunos_saude", p_acao: "escrita" });
  revalidatePath(`/treinador/alunos/${alunoId}`);
  return { ok: "Dados de saúde salvos" };
}

const esquemaEdicao = z.object({
  nome: z.string().trim().min(2),
  sexo_biologico: z.enum(["M", "F"]),
  modalidade: z.string().trim().max(80).transform((s) => s || null),
  lado_dominante: z.enum(["direito", "esquerdo", "ambidestro", ""]).transform((s) => s || null),
  status: z.enum(["ativo", "inativo", "aguardando_consentimento"]),
});

export async function editarAluno(alunoId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigirPapel("admin");
  const r = esquemaEdicao.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: "Verifique os campos" };
  const supabase = await clienteServidor();

  // Só reativa se o consentimento estiver válido
  if (r.data.status === "ativo") {
    const { data: ok } = await supabase.rpc("tem_consentimento", { p_aluno_id: alunoId, p_tipo: "dados_menor" });
    if (!ok) return { erro: "O aluno só pode ficar ativo com o consentimento de dados válido" };
  }
  const { error } = await supabase.from("alunos").update(r.data).eq("id", alunoId);
  if (error) return { erro: "Não foi possível salvar" };
  revalidatePath(`/treinador/alunos/${alunoId}`);
  return { ok: "Dados atualizados" };
}

/** Cria o login do aluno — só depois do consentimento de dados. */
export async function convidarAluno(alunoId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigirPapel("admin");
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { erro: "E-mail inválido" };

  const supabase = await clienteServidor();
  const { data: aluno } = await supabase.from("alunos").select("nome, usuario_id").eq("id", alunoId).single();
  if (!aluno) return { erro: "Aluno não encontrado" };
  if (aluno.usuario_id) return { erro: "O aluno já tem acesso" };
  const { data: consentiu } = await supabase.rpc("tem_consentimento", { p_aluno_id: alunoId, p_tipo: "dados_menor" });
  if (!consentiu) return { erro: "Aguarde o consentimento do responsável antes de criar o acesso do aluno" };

  const conta = await obterOuConvidarUsuario(email.data, aluno.nome, "aluno");
  if ("erro" in conta) return { erro: conta.erro };
  const { error } = await supabase.from("alunos").update({ usuario_id: conta.id }).eq("id", alunoId);
  if (error) return { erro: "Esse e-mail já está ligado a outro aluno" };
  revalidatePath(`/treinador/alunos/${alunoId}`);
  return { ok: conta.convidado ? "Convite enviado ao aluno" : "Conta existente vinculada" };
}

/** Reenvia o convite a um responsável que ainda não criou a senha. */
export async function reenviarConvite(email: string): Promise<void> {
  await exigirPapel("admin");
  const admin = clienteAdmin();
  // Envia link mágico (a conta já existe após o primeiro convite)
  await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
}

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

/** Envia a foto de perfil — exige consentimento de imagem válido. */
export async function enviarFoto(alunoId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigirPapel("admin");
  const arquivo = form.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem" };
  if (!TIPOS_FOTO.includes(arquivo.type)) return { erro: "Use JPG, PNG ou WEBP" };
  if (arquivo.size > 3 * 1024 * 1024) return { erro: "Imagem maior que 3 MB" };

  const supabase = await clienteServidor();
  const { data: autorizado } = await supabase.rpc("tem_consentimento", { p_aluno_id: alunoId, p_tipo: "imagem" });
  if (!autorizado) return { erro: "Sem autorização de uso de imagem do responsável" };

  const caminho = `${alunoId}/perfil-${Date.now()}.${arquivo.type.split("/")[1]}`;
  const { error } = await supabase.storage.from("fotos-alunos").upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) return { erro: "Falha no envio da foto" };

  const { data: antigo } = await supabase.from("alunos").select("foto_path").eq("id", alunoId).single();
  await supabase.from("alunos").update({ foto_path: caminho }).eq("id", alunoId);
  if (antigo?.foto_path) await supabase.storage.from("fotos-alunos").remove([antigo.foto_path]);
  revalidatePath(`/treinador/alunos/${alunoId}`);
  return { ok: "Foto atualizada" };
}
