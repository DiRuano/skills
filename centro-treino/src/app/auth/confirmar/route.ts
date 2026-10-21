import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Recebe os links enviados por e-mail (convite, link mágico, recuperação).
 * Os modelos de e-mail do Supabase devem apontar para:
 *   {{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=<tipo>
 * (ver README → "Configurar e-mails do Supabase").
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const destino = req.nextUrl.clone();
  destino.search = "";

  if (tokenHash && tipo) {
    const supabase = await clienteServidor();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) {
      // Convite e recuperação levam à definição de senha
      destino.pathname = tipo === "invite" || tipo === "recovery" ? "/auth/definir-senha" : "/";
      return NextResponse.redirect(destino);
    }
  }
  destino.pathname = "/entrar";
  destino.searchParams.set("erro", "link");
  return NextResponse.redirect(destino);
}
