import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { formatarData } from "@/lib/idade";

// Página pública: mostra a versão vigente do texto armazenado no banco
export default async function Pagina() {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("termos")
    .select("titulo, versao, conteudo, publicado_em")
    .eq("tipo", "termos_uso")
    .eq("vigente", true)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-suave underline">← Voltar</Link>
      <h1 className="mt-4 text-2xl font-bold">{data?.titulo ?? "Termos de uso"}</h1>
      {data ? (
        <>
          <p className="mt-1 text-sm text-suave">
            Versão {data.versao} · publicada em {formatarData(data.publicado_em)}
          </p>
          <div className="mt-6 whitespace-pre-line leading-relaxed">{data.conteudo}</div>
        </>
      ) : (
        <p className="mt-4 text-suave">Texto indisponível no momento.</p>
      )}
    </main>
  );
}
