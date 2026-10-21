import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clienteServidor } from "./supabase/servidor";
import { ROTA_INICIAL, type Papel, type Perfil } from "./tipos";

/** Perfil do usuário logado (ou null). Sempre valida o token no Auth. */
export async function perfilAtual(): Promise<Perfil | null> {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("perfis")
    .select("id, papel, nome, email, telefone")
    .eq("id", user.id)
    .single();
  return (data as Perfil) ?? null;
}

/**
 * Garante que o usuário está logado e tem um dos papéis permitidos.
 * Quem tem outro papel é levado para a sua própria área.
 */
export async function exigirPapel(...papeis: Papel[]): Promise<Perfil> {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");
  if (!papeis.includes(perfil.papel)) redirect(ROTA_INICIAL[perfil.papel]);
  return perfil;
}

/** IP e user-agent da requisição, para registro de consentimento e logs. */
export async function dadosRequisicao(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = encaminhado || h.get("x-real-ip") || null;
  return { ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null, userAgent: h.get("user-agent") };
}
