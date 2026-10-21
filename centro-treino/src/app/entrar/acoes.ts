"use server";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoEntrar = { erro?: string; mensagem?: string };

/** Só aceita caminhos internos no parâmetro "voltar" (evita redirecionamento aberto). */
function destinoSeguro(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function entrarComSenha(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha" };

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos" };
  redirect(destinoSeguro(form.get("voltar")));
}

export async function entrarComLink(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe o e-mail" };

  const supabase = await clienteServidor();
  // shouldCreateUser: false — contas são criadas só por convite do treinador
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  // Mesma resposta exista ou não a conta (não revela quem é cadastrado)
  return { mensagem: "Se o e-mail estiver cadastrado, você receberá um link de acesso em instantes." };
}

export async function sair() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}
