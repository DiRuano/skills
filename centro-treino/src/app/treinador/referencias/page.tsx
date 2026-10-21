import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { ROTULO_CONFIANCA, type TabelaReferencia } from "@/lib/avaliacao";
import { Aviso, Cartao, Selo } from "@/components/ui/cartao";
import { classeBotao } from "@/components/ui/botao";

export default async function Referencias() {
  const supabase = await clienteServidor();
  const [{ data: tabelas }, { data: testes }] = await Promise.all([
    supabase.from("tabelas_referencia").select("*").order("criado_em", { ascending: false }),
    supabase.from("testes").select("id, nome, tabela_padrao_id").order("ordem"),
  ]);
  const nomeTeste = new Map((testes ?? []).map((t) => [t.id, t]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tabelas de referência</h1>
        <Link href="/treinador/referencias/nova" className={classeBotao()}>+ Nova tabela</Link>
      </div>
      <Aviso titulo="Regra do app">
        Nenhum percentil ou classificação é gerado de memória. Só aparecem comparações com tabelas cadastradas aqui, a partir
        dos artigos originais, sempre com a citação. Sem tabela, o app mostra &quot;sem referência cadastrada&quot;.
      </Aviso>
      {!tabelas?.length && <p className="text-suave">Nenhuma tabela cadastrada ainda.</p>}
      <ul className="space-y-2">
        {(tabelas as TabelaReferencia[] | null)?.map((t) => {
          const teste = nomeTeste.get(t.teste_id);
          return (
            <li key={t.id}>
              <Link href={`/treinador/referencias/${t.id}`}>
                <Cartao className="space-y-1 hover:bg-superficie-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{t.nome}</p>
                    {teste?.tabela_padrao_id === t.id && <Selo tom="sucesso">Padrão</Selo>}
                  </div>
                  <p className="text-sm text-suave">
                    {teste?.nome} · {t.populacao} · {t.tipo === "percentil" ? "percentis" : "zonas"} · {ROTULO_CONFIANCA[t.nivel_confianca]}
                  </p>
                  <p className="line-clamp-2 text-xs text-suave">{t.citacao}</p>
                </Cartao>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
