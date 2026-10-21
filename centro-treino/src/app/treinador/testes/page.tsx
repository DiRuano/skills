import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Teste } from "@/lib/avaliacao";
import { Cartao, Selo } from "@/components/ui/cartao";
import { Botao } from "@/components/ui/botao";
import { FormTeste } from "./formulario";
import { alternarAtivo } from "./acoes";

export default async function BateriaTestes() {
  const supabase = await clienteServidor();
  const [{ data: testes }, { data: tabelas }] = await Promise.all([
    supabase.from("testes").select("*").order("ordem"),
    supabase.from("tabelas_referencia").select("id, nome, teste_id"),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Bateria de testes</h1>
        <p className="text-suave">
          Ative os testes que você usa. Cada teste compara com a{" "}
          <Link href="/treinador/referencias" className="underline">tabela de referência</Link> escolhida como padrão.
        </p>
      </div>
      <ul className="space-y-3">
        {(testes as Teste[] | null)?.map((t) => {
          const tabs = (tabelas ?? []).filter((x) => x.teste_id === t.id);
          const padrao = tabs.find((x) => x.id === t.tabela_padrao_id);
          return (
            <li key={t.id}>
              <Cartao className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.nome}</p>
                    <p className="text-sm text-suave">
                      {t.unidade} · {t.maior_melhor ? "maior é melhor" : "menor é melhor"}
                      {t.tipo === "numerico" ? ` · ${t.tentativas}× (${t.criterio === "melhor" ? "melhor" : "média"})` : " · critérios"}
                      {t.por_lado ? " · D/E" : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {padrao ? <Selo tom="info">Ref.: {padrao.nome}</Selo> : <Selo>Sem tabela de referência</Selo>}
                      {!t.padrao && <Selo>Personalizado</Selo>}
                    </div>
                  </div>
                  <form action={alternarAtivo.bind(null, t.id, !t.ativo)}>
                    <Botao type="submit" variante={t.ativo ? "secundario" : "primario"} className="min-h-10 text-sm">
                      {t.ativo ? "Na bateria ✓" : "Ativar"}
                    </Botao>
                  </form>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm text-suave">Editar</summary>
                  <div className="mt-3">
                    <FormTeste teste={t} tabelas={tabs} />
                  </div>
                </details>
              </Cartao>
            </li>
          );
        })}
      </ul>
      <Cartao className="space-y-3">
        <h2 className="text-lg font-semibold">Criar teste personalizado</h2>
        <FormTeste tabelas={[]} />
      </Cartao>
    </div>
  );
}
