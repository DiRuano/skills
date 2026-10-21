"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";
import { hojeSP } from "@/lib/idade";
import { numero } from "@/lib/csv";
import { montarResultados, type TesteForm } from "@/lib/resultados";

export type EstadoAvaliacao = { erros?: string[] };

const medida = (min: number, max: number, nome: string) =>
  z
    .string()
    .optional()
    .transform((s) => numero(s))
    .refine((v) => v == null || (v >= min && v <= max), `${nome}: entre ${min} e ${max}`);

const esquema = z
  .object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").refine((d) => d <= hojeSP(), "Data no futuro"),
    massa_kg: medida(10, 200, "Massa (kg)"),
    estatura_cm: medida(80, 230, "Estatura (cm)"),
    altura_sentado_cm: medida(40, 130, "Altura sentado (cm)"),
    envergadura_cm: medida(80, 250, "Envergadura (cm)"),
    estatura_mae_cm: medida(120, 220, "Estatura da mãe (cm)"),
    estatura_pai_cm: medida(120, 230, "Estatura do pai (cm)"),
    observacoes: z.string().max(2000).optional(),
  })
  .refine((d) => d.altura_sentado_cm == null || d.estatura_cm == null || d.altura_sentado_cm < d.estatura_cm, {
    message: "Altura sentado precisa ser menor que a estatura",
  });

export async function registrarAvaliacao(alunoId: string, _: EstadoAvaliacao, form: FormData): Promise<EstadoAvaliacao> {
  await exigirPapel("admin");
  const campos = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const r = esquema.safeParse(campos);
  if (!r.success) return { erros: r.error.issues.map((i) => i.message) };

  const supabase = await clienteServidor();
  const { data: consentiu } = await supabase.rpc("tem_consentimento", { p_aluno_id: alunoId, p_tipo: "dados_menor" });
  if (!consentiu) return { erros: ["Sem consentimento de dados válido: não é possível registrar a avaliação"] };

  const { data: testes } = await supabase.from("testes").select("*").eq("ativo", true);
  const { resultados, erros } = montarResultados(campos, (testes ?? []) as TesteForm[]);
  if (erros.length) return { erros };
  const d = r.data;
  if (!resultados.length && d.massa_kg == null && d.estatura_cm == null) {
    return { erros: ["Preencha ao menos uma medida ou um teste"] };
  }

  const { data: av, error } = await supabase
    .from("avaliacoes")
    .insert({
      aluno_id: alunoId,
      data: d.data,
      avaliador_id: (await supabase.auth.getUser()).data.user?.id,
      massa_kg: d.massa_kg,
      estatura_cm: d.estatura_cm,
      altura_sentado_cm: d.altura_sentado_cm,
      envergadura_cm: d.envergadura_cm,
      observacoes: d.observacoes?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !av) return { erros: ["Não foi possível salvar a avaliação"] };

  if (resultados.length) {
    const { error: e2 } = await supabase.from("resultados_testes").insert(resultados.map((x) => ({ ...x, avaliacao_id: av.id })));
    if (e2) {
      // Sem transação no PostgREST: desfaz a avaliação para não deixar registro pela metade
      await supabase.from("avaliacoes").delete().eq("id", av.id);
      return { erros: ["Não foi possível salvar os resultados dos testes"] };
    }
  }

  if (d.estatura_mae_cm != null || d.estatura_pai_cm != null) {
    await supabase.from("alunos_familia").upsert({
      aluno_id: alunoId,
      estatura_mae_cm: d.estatura_mae_cm,
      estatura_pai_cm: d.estatura_pai_cm,
    });
  }
  redirect(`/treinador/avaliacoes/${av.id}?nova=1`);
}
