import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { historicoAluno, resumirAvaliacao } from "@/lib/avaliacao";
import { formatarData } from "@/lib/idade";
import { PainelAvaliacao } from "@/components/avaliacao/painel";
import { classeBotao } from "@/components/ui/botao";

// A RLS só devolve avaliações publicadas dos filhos deste responsável
export default async function RelatorioResponsavel({ params }: { params: Promise<{ avaliacaoId: string }> }) {
  const { avaliacaoId } = await params;
  const resumo = await resumirAvaliacao(avaliacaoId);
  if (!resumo) notFound();
  const { porTeste } = await historicoAluno(resumo.aluno.id);
  return (
    <div className="space-y-4">
      <Link href="/responsavel" className="text-sm text-suave underline">← Meus filhos</Link>
      <h1 className="text-2xl font-bold">{resumo.aluno.nome.split(" ")[0]} — avaliação de {formatarData(resumo.avaliacao.data)}</h1>
      <a href={`/api/relatorio/${avaliacaoId}`} target="_blank" className={classeBotao("secundario")}>
        <FileDown className="size-4" /> Baixar PDF
      </a>
      <PainelAvaliacao resumo={resumo} historico={porTeste} modo="responsavel" />
    </div>
  );
}
