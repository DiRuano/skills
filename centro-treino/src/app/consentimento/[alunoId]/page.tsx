import { notFound } from "next/navigation";
import { autorizacaoConsentimento } from "@/lib/consentimento";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Termo, TipoTermo } from "@/lib/tipos";
import { FormularioConsentimento } from "./formulario";
import { RodapeLegal } from "@/components/rodape-legal";
import { AlternarTema } from "@/components/alternar-tema";

export default async function PaginaConsentimento({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const auth = await autorizacaoConsentimento(alunoId);
  if (!auth) notFound();

  const supabase = await clienteServidor();
  const { data } = await supabase.from("termos").select("*").eq("vigente", true);
  const termos = Object.fromEntries((data as Termo[]).map((t) => [t.tipo, t])) as Record<TipoTermo, Termo>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Consentimento</h1>
          <p className="mt-1 text-suave">
            {auth.qualidade === "titular"
              ? "Antes de começar, precisamos da sua autorização."
              : `Antes de avaliar e treinar ${auth.aluno.nome}, a lei pede a autorização de um responsável.`}
          </p>
        </div>
        <AlternarTema />
      </div>
      <FormularioConsentimento
        alunoId={alunoId}
        nomeAluno={auth.aluno.nome}
        titular={auth.qualidade === "titular"}
        termos={termos}
      />
      <RodapeLegal />
    </main>
  );
}
