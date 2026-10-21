import { historicoAluno } from "@/lib/avaliacao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { Cartao } from "@/components/ui/cartao";
import { LinhaDoTempo } from "@/components/avaliacao/graficos";

/**
 * "Minha evolução" do aluno: só compara o aluno com ele mesmo.
 * Sem percentis nem médias da turma, para não constranger.
 */
export async function MinhaEvolucao({ alunoId }: { alunoId: string }) {
  const { porTeste } = await historicoAluno(alunoId); // RLS: só avaliações publicadas
  const supabase = await clienteServidor();
  const { data: testes } = await supabase.from("testes").select("id, nome, unidade, maior_melhor, ordem").order("ordem");
  const lado = { unico: "", D: " (direito)", E: " (esquerdo)" } as Record<string, string>;

  const itens = [...porTeste.entries()]
    .map(([chave, pontos]) => {
      const [testeId, l] = chave.split("|");
      const t = testes?.find((x) => x.id === testeId);
      return t ? { chave, t, nome: t.nome + (lado[l] ?? ""), pontos } : null;
    })
    .filter((x) => x !== null)
    .sort((a, b) => a.t.ordem - b.t.ordem);

  if (!itens.length) return <p className="text-suave">Sua evolução aparece aqui depois da primeira avaliação.</p>;

  return (
    <div className="space-y-3">
      {itens.map(({ chave, t, nome, pontos }) => {
        const atual = pontos[pontos.length - 1].valor;
        const anterior = pontos.length > 1 ? pontos[pontos.length - 2].valor : null;
        const melhorou = anterior != null && (t.maior_melhor ? atual > anterior : atual < anterior);
        const recorde = pontos.every((p) => (t.maior_melhor ? atual >= p.valor : atual <= p.valor));
        return (
          <Cartao key={chave} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{nome}</p>
              <p className="text-xl font-bold">
                {atual.toLocaleString("pt-BR")} <span className="text-sm font-normal text-suave">{t.unidade}</span>
              </p>
            </div>
            {anterior != null && (
              <p className="text-sm text-suave">
                {recorde && pontos.length > 1 ? "🏅 Seu melhor resultado até agora!" : melhorou ? "Melhorou desde a última vez 💪" : "Antes: " + anterior.toLocaleString("pt-BR") + " " + t.unidade}
              </p>
            )}
            {pontos.length >= 2 && <LinhaDoTempo pontos={pontos} unidade={t.unidade} maiorMelhor={t.maior_melhor} />}
          </Cartao>
        );
      })}
    </div>
  );
}
