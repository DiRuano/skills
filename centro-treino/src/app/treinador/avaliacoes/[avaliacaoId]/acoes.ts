"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";
import { resumirAvaliacao } from "@/lib/avaliacao";
import { gerarRelatorioPdf } from "@/lib/pdf/gerar";
import { enviarEmail, escaparHtml } from "@/lib/email";

export type EstadoEnvio = { erro?: string; ok?: string };

export async function alternarPublicacao(avaliacaoId: string, publicar: boolean) {
  await exigirPapel("admin");
  const supabase = await clienteServidor();
  await supabase
    .from("avaliacoes")
    .update({ publicada_em: publicar ? new Date().toISOString() : null })
    .eq("id", avaliacaoId);
  revalidatePath(`/treinador/avaliacoes/${avaliacaoId}`);
}

/** Publica (se preciso) e envia o PDF por e-mail a todos os responsáveis do aluno. */
export async function enviarAosResponsaveis(avaliacaoId: string, _: EstadoEnvio): Promise<EstadoEnvio> {
  const perfil = await exigirPapel("admin");
  const supabase = await clienteServidor();
  const resumo = await resumirAvaliacao(avaliacaoId);
  if (!resumo) return { erro: "Avaliação não encontrada" };

  const { data: vinculos } = await supabase
    .from("responsaveis_alunos")
    .select("perfis(nome, email)")
    .eq("aluno_id", resumo.aluno.id);
  const destinos = ((vinculos ?? []) as unknown as { perfis: { nome: string; email: string } | null }[])
    .map((v) => v.perfis)
    .filter((p): p is { nome: string; email: string } => Boolean(p?.email));
  if (!destinos.length) return { erro: "O aluno não tem responsável com e-mail" };

  if (!resumo.avaliacao.publicada_em) {
    await supabase.from("avaliacoes").update({ publicada_em: new Date().toISOString() }).eq("id", avaliacaoId);
  }

  const pdf = await gerarRelatorioPdf(resumo);
  const nomeCentro = process.env.NEXT_PUBLIC_NOME_CENTRO ?? "Centro de Treinamento";
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/responsavel/avaliacoes/${avaliacaoId}`;
  const falhas: string[] = [];
  for (const d of destinos) {
    const r = await enviarEmail({
      para: d.email,
      assunto: `Avaliação física de ${resumo.aluno.nome.split(" ")[0]}`,
      html: `<p>Olá${d.nome ? `, ${escaparHtml(d.nome.split(" ")[0])}` : ""}!</p>
<p>O relatório da avaliação de <strong>${escaparHtml(resumo.aluno.nome)}</strong> está anexo e também disponível no app:</p>
<p><a href="${link}">${link}</a></p>
<p>Qualquer dúvida, fale com o treinador.</p><p>${escaparHtml(nomeCentro)}</p>`,
      anexos: [{ nome: `avaliacao-${resumo.avaliacao.data}.pdf`, conteudo: pdf }],
    });
    if ("erro" in r) falhas.push(`${d.email}: ${r.erro}`);
    else await supabase.from("relatorios_enviados").insert({ avaliacao_id: avaliacaoId, enviado_para: d.email, enviado_por: perfil.id });
  }
  revalidatePath(`/treinador/avaliacoes/${avaliacaoId}`);
  if (falhas.length) {
    return { erro: `Publicado na área do responsável, mas o e-mail falhou — ${falhas.join("; ")}` };
  }
  return { ok: `Enviado para ${destinos.map((d) => d.email).join(", ")}` };
}

export async function excluirAvaliacao(avaliacaoId: string, alunoId: string) {
  await exigirPapel("admin");
  const supabase = await clienteServidor();
  await supabase.from("avaliacoes").delete().eq("id", avaliacaoId);
  redirect(`/treinador/alunos/${alunoId}?aba=avaliacoes`);
}
