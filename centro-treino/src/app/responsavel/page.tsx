import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { formatarData, idadeAnos } from "@/lib/idade";
import type { Aluno, ConsentimentoAtual } from "@/lib/tipos";
import { Aviso, Cartao, Selo } from "@/components/ui/cartao";
import { classeBotao } from "@/components/ui/botao";

export default async function AreaResponsavel({ searchParams }: { searchParams: Promise<{ consentido?: string }> }) {
  const { consentido } = await searchParams;
  const supabase = await clienteServidor();
  // A RLS já limita aos filhos vinculados a este responsável
  const [{ data: filhos }, { data: consent }, { data: avaliacoes }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome"),
    supabase.from("consentimentos_atuais").select("*").eq("tipo", "dados_menor"),
    // RLS: só as avaliações publicadas dos filhos
    supabase.from("avaliacoes").select("id, aluno_id, data").order("data", { ascending: false }),
  ]);
  const valido = new Map((consent as ConsentimentoAtual[] | null)?.map((c) => [c.aluno_id, c]));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Meus filhos</h1>
      {consentido && <Aviso tom="sucesso" titulo="Consentimento registrado. Obrigado!" />}
      {!filhos?.length && (
        <Aviso titulo="Nenhum aluno vinculado">Fale com o treinador para vincular seu filho à sua conta.</Aviso>
      )}
      <ul className="space-y-3">
        {(filhos as Aluno[] | null)?.map((f) => {
          const c = valido.get(f.id);
          const pendente = !c?.valido;
          return (
            <li key={f.id}>
              <Cartao className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{f.nome}</p>
                    <p className="text-sm text-suave">{idadeAnos(f.data_nascimento)} anos{f.modalidade ? ` · ${f.modalidade}` : ""}</p>
                  </div>
                  <Selo tom={pendente ? "alerta" : "sucesso"}>{pendente ? "Autorização pendente" : "Ativo"}</Selo>
                </div>
                {pendente && (
                  <>
                    <p className="text-sm text-suave">
                      {c && c.concedido
                        ? "Os termos foram atualizados. Confira e confirme novamente."
                        : "Para começar as avaliações e treinos, precisamos da sua autorização."}
                    </p>
                    <Link href={`/consentimento/${f.id}`} className={classeBotao("primario", "w-full")}>
                      Ler e autorizar
                    </Link>
                  </>
                )}
                {!pendente && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Avaliações</p>
                    {avaliacoes?.some((a) => a.aluno_id === f.id) ? (
                      <ul className="space-y-1">
                        {avaliacoes
                          .filter((a) => a.aluno_id === f.id)
                          .map((a) => (
                            <li key={a.id}>
                              <Link href={`/responsavel/avaliacoes/${a.id}`} className="flex items-center justify-between rounded-xl bg-superficie-2 px-4 py-3 text-sm">
                                <span>Avaliação de {formatarData(a.data)}</span>
                                <span className="text-suave">Ver relatório →</span>
                              </Link>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-suave">Nenhum relatório publicado ainda.</p>
                    )}
                  </div>
                )}
              </Cartao>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
