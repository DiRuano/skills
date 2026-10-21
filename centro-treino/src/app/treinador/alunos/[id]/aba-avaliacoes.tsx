import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { historicoAluno, resumirAvaliacao } from "@/lib/avaliacao";
import { formatarData } from "@/lib/idade";
import { Aviso, Cartao, Selo } from "@/components/ui/cartao";
import { classeBotao } from "@/components/ui/botao";
import { PainelAvaliacao } from "@/components/avaliacao/painel";

/** Aba de avaliações da ficha: lista e o painel da mais recente com a linha do tempo. */
export async function AbaAvaliacoes({ alunoId, liberado }: { alunoId: string; liberado: boolean }) {
  const { avaliacoes, porTeste } = await historicoAluno(alunoId);
  const recentes = [...avaliacoes].reverse();
  const ultima = recentes[0] ? await resumirAvaliacao(recentes[0].id) : null;

  return (
    <div className="space-y-4">
      {liberado ? (
        <Link href={`/treinador/alunos/${alunoId}/avaliacoes/nova`} className={classeBotao("primario", "w-full sm:w-auto")}>
          + Nova avaliação
        </Link>
      ) : (
        <Aviso tom="alerta" titulo="Aguardando consentimento">
          Avaliações ficam liberadas depois do consentimento do responsável.
        </Aviso>
      )}

      {recentes.length > 0 && (
        <Cartao className="p-0 sm:p-0">
          <ul>
            {recentes.map((a) => (
              <li key={a.id} className="border-t border-borda first:border-t-0">
                <Link href={`/treinador/avaliacoes/${a.id}`} className="flex items-center justify-between gap-2 p-4 hover:bg-superficie-2">
                  <span className="font-medium">{formatarData(a.data)}</span>
                  <span className="flex items-center gap-2">
                    <Selo tom={a.publicada_em ? "sucesso" : "neutro"}>{a.publicada_em ? "Publicada" : "Rascunho"}</Selo>
                    <ChevronRight className="size-4 text-suave" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {ultima ? (
        <>
          <h2 className="text-lg font-semibold">Mais recente — {formatarData(ultima.avaliacao.data)}</h2>
          <PainelAvaliacao resumo={ultima} historico={porTeste} modo="treinador" />
        </>
      ) : (
        <p className="text-sm text-suave">Nenhuma avaliação registrada.</p>
      )}
    </div>
  );
}
