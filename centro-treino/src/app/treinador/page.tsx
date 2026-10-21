import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { Aviso, Cartao } from "@/components/ui/cartao";
import { classeBotao } from "@/components/ui/botao";

export default async function PainelTreinador() {
  const supabase = await clienteServidor();
  const contar = (status: string) =>
    supabase.from("alunos").select("id", { count: "exact", head: true }).eq("status", status);
  const [ativos, aguardando, solicitacoes] = await Promise.all([
    contar("ativo"),
    contar("aguardando_consentimento"),
    supabase.from("solicitacoes_exclusao").select("id", { count: "exact", head: true }).eq("status", "pendente"),
  ]);

  const numeros = [
    { rotulo: "Alunos ativos", valor: ativos.count ?? 0, href: "/treinador/alunos?status=ativo" },
    { rotulo: "Aguardando consentimento", valor: aguardando.count ?? 0, href: "/treinador/alunos?status=aguardando_consentimento" },
    { rotulo: "Pedidos LGPD pendentes", valor: solicitacoes.count ?? 0, href: "/treinador/solicitacoes" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Painel</h1>
        <Link href="/treinador/alunos/novo" className={classeBotao()}>+ Novo aluno</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {numeros.map((n) => (
          <Link key={n.rotulo} href={n.href}>
            <Cartao className="hover:bg-superficie-2">
              <p className="text-3xl font-bold">{n.valor}</p>
              <p className="text-sm text-suave">{n.rotulo}</p>
            </Cartao>
          </Link>
        ))}
      </div>
      {(solicitacoes.count ?? 0) > 0 && (
        <Aviso tom="alerta" titulo="Há pedidos de exclusão de dados aguardando resposta">
          A LGPD exige resposta ao titular. <Link href="/treinador/solicitacoes" className="underline">Ver pedidos</Link>
        </Aviso>
      )}
      <Aviso titulo="Em construção">
        Alertas de treino, aderência e resumo financeiro chegam nas Fases 4 e 5.
      </Aviso>
    </div>
  );
}
