import { NextResponse } from "next/server";
import { autorizacaoConsentimento } from "@/lib/consentimento";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteServidor } from "@/lib/supabase/servidor";
import { decifrar } from "@/lib/cripto";
import { dadosRequisicao } from "@/lib/auth";

/**
 * Portabilidade (LGPD art. 18, V): o responsável (ou o titular maior de
 * idade) baixa todos os dados do aluno em JSON, inclusive os de saúde.
 * A permissão é checada com a sessão; a leitura usa a chave de serviço
 * porque o responsável não lê a tabela de saúde diretamente.
 */
export async function GET(_: Request, { params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const auth = await autorizacaoConsentimento(alunoId);
  if (!auth) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const admin = clienteAdmin();
  const [aluno, saude, vinculos, consentimentos, familia, avaliacoes] = await Promise.all([
    admin.from("alunos").select("*").eq("id", alunoId).single(),
    admin.from("alunos_saude").select("*").eq("aluno_id", alunoId).maybeSingle(),
    admin.from("responsaveis_alunos").select("parentesco, principal, criado_em, perfis(nome, email, telefone)").eq("aluno_id", alunoId),
    admin
      .from("consentimentos")
      .select("concedido, qualidade, ip, user_agent, registrado_em, termos(tipo, versao, hash_conteudo)")
      .eq("aluno_id", alunoId)
      .order("registrado_em"),
    admin.from("alunos_familia").select("estatura_mae_cm, estatura_pai_cm, autorrelatada").eq("aluno_id", alunoId).maybeSingle(),
    admin
      .from("avaliacoes")
      .select("data, massa_kg, estatura_cm, altura_sentado_cm, envergadura_cm, observacoes, publicada_em, resultados_testes(lado, tentativas, valor, criterios, testes(nome, unidade))")
      .eq("aluno_id", alunoId)
      .order("data"),
  ]);

  // Registra a exportação no log de acesso a dados sensíveis
  const { ip } = await dadosRequisicao();
  const supabase = await clienteServidor();
  await supabase.rpc("registrar_acesso", {
    p_aluno_id: alunoId,
    p_recurso: "exportacao_dados",
    p_acao: "exportacao",
    p_detalhes: { ip },
  });

  const corpo = {
    gerado_em: new Date().toISOString(),
    aviso: "Exportação de dados pessoais conforme LGPD, art. 18, V.",
    aluno: aluno.data,
    saude: saude.data
      ? {
          historico_lesoes: decifrar(saude.data.historico_lesoes_cifrado),
          observacoes: decifrar(saude.data.observacoes_cifrado),
          atualizado_em: saude.data.atualizado_em,
        }
      : null,
    responsaveis: vinculos.data,
    consentimentos: consentimentos.data,
    estatura_pais: familia.data,
    avaliacoes: avaliacoes.data,
    // Treinos e pagamentos entram aqui nas próximas fases
  };

  return new NextResponse(JSON.stringify(corpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dados-${alunoId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
