"use server";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function definirSenha(_: { erro?: string }, form: FormData): Promise<{ erro?: string }> {
  const senha = String(form.get("senha") ?? "");
  const confirmacao = String(form.get("confirmacao") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres" };
  if (senha !== confirmacao) return { erro: "As senhas não conferem" };

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Não foi possível salvar a senha. Tente abrir o link do e-mail de novo." };
  redirect("/");
}
