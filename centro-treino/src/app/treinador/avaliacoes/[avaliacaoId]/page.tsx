import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { historicoAluno, resumirAvaliacao } from "@/lib/avaliacao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { formatarData, formatarDataHora } from "@/lib/idade";
import { PainelAvaliacao } from "@/components/avaliacao/painel";
import { Aviso, Selo } from "@/components/ui/cartao";
import { Botao, classeBotao } from "@/components/ui/botao";
import { alternarPublicacao, excluirAvaliacao } from "./acoes";
import { BotaoEnviar } from "./botoes";

export default async function PaginaAvaliacao({
  params,
  searchParams,
}: {
  params: Promise<{ avaliacaoId: string }>;
  searchParams: Promise<{ nova?: string }>;
}) {
  const { avaliacaoId } = await params;
  const { nova } = await searchParams;
  const resumo = await resumirAvaliacao(avaliacaoId);
  if (!resumo) notFound();
  const { porTeste } = await historicoAluno(resumo.aluno.id);
  const supabase = await clienteServidor();
  const { data: envios } = await supabase
    .from("relatorios_enviados")
    .select("enviado_para, enviado_em")
    .eq("avaliacao_id", avaliacaoId)
    .order("enviado_em", { ascending: false });
  const publicada = Boolean(resumo.avaliacao.publicada_em);

  return (
    <div className="space-y-4">
      <Link href={`/treinador/alunos/${resumo.aluno.id}?aba=avaliacoes`} className="text-sm text-suave underline">
        ← {resumo.aluno.nome}
      </Link>
      {nova && <Aviso tom="sucesso" titulo="Avaliação salva" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Avaliação de {formatarData(resumo.avaliacao.data)}</h1>
        <Selo tom={publicada ? "sucesso" : "neutro"}>{publicada ? "Publicada para a família" : "Rascunho (só treinador)"}</Selo>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/relatorio/${avaliacaoId}`} target="_blank" className={classeBotao("secundario")}>
          <FileDown className="size-4" /> PDF
        </a>
        <form action={alternarPublicacao.bind(null, avaliacaoId, !publicada)}>
          <Botao type="submit" variante="secundario">{publicada ? "Despublicar" : "Publicar"}</Botao>
        </form>
        <BotaoEnviar avaliacaoId={avaliacaoId} />
      </div>
      {envios?.length ? (
        <p className="text-xs text-suave">
          Enviado: {envios.map((e) => `${e.enviado_para} (${formatarDataHora(e.enviado_em)})`).join(" · ")}
        </p>
      ) : null}

      {resumo.avaliacao.observacoes && <Aviso titulo="Observações">{resumo.avaliacao.observacoes}</Aviso>}

      <PainelAvaliacao resumo={resumo} historico={porTeste} modo="treinador" />

      <details className="rounded-2xl border border-perigo/40 p-4">
        <summary className="cursor-pointer text-sm text-perigo">Excluir avaliação</summary>
        <form action={excluirAvaliacao.bind(null, avaliacaoId, resumo.aluno.id)} className="mt-3">
          <Botao type="submit" variante="perigo">Excluir definitivamente</Botao>
        </form>
      </details>
    </div>
  );
}
