import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { ROTULO_CONFIANCA, type TabelaReferencia } from "@/lib/avaliacao";
import { paresPercentil } from "@/lib/ciencia/referencia";
import { Cartao, Selo } from "@/components/ui/cartao";
import { Botao } from "@/components/ui/botao";
import { definirPadrao, excluirTabela } from "../acoes";

type FaixaLinha = { id: string; sexo: "M" | "F"; idade_min: number; idade_max: number; valores: Record<string, unknown> };

const fmtIdade = (n: number) => Number(n).toLocaleString("pt-BR");

export default async function DetalheTabela({ params }: { params: Promise<{ tabelaId: string }> }) {
  const { tabelaId } = await params;
  const supabase = await clienteServidor();
  const { data: tabela } = await supabase.from("tabelas_referencia").select("*").eq("id", tabelaId).maybeSingle<TabelaReferencia>();
  if (!tabela) notFound();
  const [{ data: teste }, { data: faixas }] = await Promise.all([
    supabase.from("testes").select("id, nome, unidade, tabela_padrao_id").eq("id", tabela.teste_id).single(),
    supabase.from("faixas_referencia").select("*").eq("tabela_id", tabelaId).order("sexo").order("idade_min"),
  ]);
  const lista = (faixas ?? []) as FaixaLinha[];
  const colunas =
    tabela.tipo === "percentil"
      ? [...new Set(lista.flatMap((f) => paresPercentil(f.valores as Record<string, number>).map(([p]) => p)))].sort((a, b) => a - b)
      : [];

  return (
    <div className="space-y-4">
      <Link href="/treinador/referencias" className="text-sm text-suave underline">← Tabelas de referência</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{tabela.nome}</h1>
        {teste?.tabela_padrao_id === tabela.id ? (
          <Selo tom="sucesso">Padrão de {teste?.nome}</Selo>
        ) : (
          <form action={definirPadrao.bind(null, tabela.id, tabela.teste_id)}>
            <Botao type="submit" variante="secundario" className="min-h-10 text-sm">Usar como padrão</Botao>
          </form>
        )}
      </div>
      <Cartao className="space-y-1 text-sm">
        <p><span className="text-suave">Teste:</span> {teste?.nome} ({teste?.unidade})</p>
        <p><span className="text-suave">População:</span> {tabela.populacao}</p>
        <p><span className="text-suave">Confiança:</span> {ROTULO_CONFIANCA[tabela.nivel_confianca]}</p>
        <p className="pt-2 text-xs text-suave">{tabela.citacao} {tabela.doi_url}</p>
      </Cartao>

      <Cartao className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-superficie-2 text-left text-suave">
            <tr>
              <th className="px-3 py-2 font-medium">Sexo</th>
              <th className="px-3 py-2 font-medium">Idade</th>
              {tabela.tipo === "percentil"
                ? colunas.map((p) => <th key={p} className="px-3 py-2 text-right font-medium">P{p}</th>)
                : <th className="px-3 py-2 font-medium">Zonas</th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className="border-t border-borda">
                <td className="px-3 py-2">{f.sexo}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtIdade(f.idade_min)} a &lt;{fmtIdade(f.idade_max)}</td>
                {tabela.tipo === "percentil"
                  ? colunas.map((p) => (
                      <td key={p} className="px-3 py-2 text-right tabular-nums">
                        {(f.valores as Record<string, number>)[`P${p}`] ?? "—"}
                      </td>
                    ))
                  : (
                      <td className="px-3 py-2">
                        {((f.valores as { zonas: { rotulo: string; min: number | null; max: number | null }[] }).zonas ?? [])
                          .map((z) => `${z.rotulo}: ${z.min ?? "−∞"}–${z.max ?? "∞"}`)
                          .join(" · ")}
                      </td>
                    )}
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      <details className="rounded-2xl border border-perigo/40 p-4">
        <summary className="cursor-pointer text-sm text-perigo">Excluir tabela</summary>
        <p className="mt-2 text-sm text-suave">Comparações deste teste passarão a mostrar &quot;sem referência cadastrada&quot; se ela for a padrão.</p>
        <form action={excluirTabela.bind(null, tabela.id)} className="mt-3">
          <Botao type="submit" variante="perigo">Excluir</Botao>
        </form>
      </details>
    </div>
  );
}
