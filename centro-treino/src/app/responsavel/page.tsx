import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { idadeAnos } from "@/lib/idade";
import type { Aluno, ConsentimentoAtual } from "@/lib/tipos";
import { Aviso, Cartao, Selo } from "@/components/ui/cartao";
import { classeBotao } from "@/components/ui/botao";

export default async function AreaResponsavel({ searchParams }: { searchParams: Promise<{ consentido?: string }> }) {
  const { consentido } = await searchParams;
  const supabase = await clienteServidor();
  // A RLS já limita aos filhos vinculados a este responsável
  const [{ data: filhos }, { data: consent }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome"),
    supabase.from("consentimentos_atuais").select("*").eq("tipo", "dados_menor"),
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
                  <p className="text-sm text-suave">Relatórios de avaliação e assinatura aparecem aqui nas próximas fases.</p>
                )}
              </Cartao>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
