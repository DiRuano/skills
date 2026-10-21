import { NextResponse } from "next/server";
import { resumirAvaliacao } from "@/lib/avaliacao";
import { gerarRelatorioPdf } from "@/lib/pdf/gerar";

/**
 * PDF da avaliação. A leitura passa pela RLS: o treinador vê qualquer uma;
 * responsável e aluno só as publicadas dos próprios filhos / de si mesmo.
 */
export async function GET(_: Request, { params }: { params: Promise<{ avaliacaoId: string }> }) {
  const { avaliacaoId } = await params;
  const resumo = await resumirAvaliacao(avaliacaoId);
  if (!resumo) return NextResponse.json({ erro: "Avaliação não encontrada" }, { status: 404 });
  const pdf = await gerarRelatorioPdf(resumo);
  const nome = `avaliacao-${resumo.aluno.nome.split(" ")[0].toLowerCase()}-${resumo.avaliacao.data}.pdf`
    .normalize("NFD")
    .replace(/[^\w.-]/g, "");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
