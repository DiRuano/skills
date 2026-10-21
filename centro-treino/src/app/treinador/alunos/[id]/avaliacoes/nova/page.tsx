import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { Aviso } from "@/components/ui/cartao";
import { FormularioAvaliacao } from "./formulario";

export default async function NovaAvaliacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await clienteServidor();
  const [{ data: aluno }, { data: testes }, { data: familia }, { data: consentiu }] = await Promise.all([
    supabase.from("alunos").select("id, nome").eq("id", id).maybeSingle(),
    supabase.from("testes").select("*").eq("ativo", true).order("ordem"),
    supabase.from("alunos_familia").select("estatura_mae_cm, estatura_pai_cm").eq("aluno_id", id).maybeSingle(),
    supabase.rpc("tem_consentimento", { p_aluno_id: id, p_tipo: "dados_menor" }),
  ]);
  if (!aluno) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/treinador/alunos/${id}?aba=avaliacoes`} className="text-sm text-suave underline">← {aluno.nome}</Link>
      <h1 className="text-2xl font-bold">Nova avaliação</h1>
      {consentiu ? (
        <FormularioAvaliacao alunoId={id} testes={testes ?? []} familia={familia} />
      ) : (
        <Aviso tom="alerta" titulo="Aguardando consentimento">
          Sem o consentimento do responsável não é possível registrar avaliações.
        </Aviso>
      )}
    </div>
  );
}
