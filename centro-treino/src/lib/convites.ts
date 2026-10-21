import "server-only";
import { clienteAdmin } from "./supabase/admin";
import type { Papel } from "./tipos";

/**
 * Encontra o usuário pelo e-mail ou envia convite para criar a conta.
 * O papel é gravado em app_metadata (só o servidor consegue) e no perfil.
 * Retorna erro se o e-mail já pertence a alguém com outro papel.
 */
export async function obterOuConvidarUsuario(
  email: string,
  nome: string,
  papel: Exclude<Papel, "admin">,
): Promise<{ id: string; convidado: boolean } | { erro: string }> {
  const admin = clienteAdmin();

  const { data: existente } = await admin.from("perfis").select("id, papel").eq("email", email).maybeSingle();
  if (existente) {
    if (existente.papel !== papel) {
      return { erro: `O e-mail ${email} já está cadastrado com outro perfil (${existente.papel}).` };
    }
    return { id: existente.id, convidado: false };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/definir-senha`,
  });
  if (error || !data.user) return { erro: `Não foi possível enviar o convite para ${email}.` };

  // O gatilho cria o perfil como "responsavel"; ajusta se for aluno.
  if (papel !== "responsavel") {
    await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { papel } });
    await admin.from("perfis").update({ papel }).eq("id", data.user.id);
  }
  return { id: data.user.id, convidado: true };
}
