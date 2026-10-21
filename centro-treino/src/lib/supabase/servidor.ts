import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Cliente com a sessão do usuário logado — respeita a RLS. */
export async function clienteServidor() {
  const loja = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => loja.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => loja.set(name, value, options));
          } catch {
            // Chamado de Server Component: o middleware renova a sessão.
          }
        },
      },
    },
  );
}
