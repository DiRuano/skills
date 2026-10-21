"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";

export type Estado = { erro?: string; ok?: string };

export async function alternarAtivo(testeId: string, ativo: boolean) {
  await exigirPapel("admin");
  const supabase = await clienteServidor();
  await supabase.from("testes").update({ ativo }).eq("id", testeId);
  revalidatePath("/treinador/testes");
}

const esquemaTeste = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  categoria: z.string().trim().min(2).default("outro"),
  unidade: z.string().trim().min(1, "Informe a unidade"),
  tipo: z.enum(["numerico", "criterios"]),
  maior_melhor: z.enum(["sim", "nao"]).transform((v) => v === "sim"),
  tentativas: z.coerce.number().int().min(1).max(10),
  criterio: z.enum(["melhor", "media"]),
  por_lado: z.preprocess((v) => v === "on", z.boolean()),
  criterios_texto: z.string().optional(),
  protocolo: z.string().max(2000).optional(),
  tabela_padrao_id: z.string().optional(),
});

/** Converte "Agachamento:3\nHop D:3" em [{nome, max}]. */
function lerCriterios(texto: string | undefined) {
  return (texto ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [nome, max] = l.split(":").map((x) => x.trim());
      return { nome, max: Number(max) };
    });
}

export async function salvarTeste(testeId: string | null, _: Estado, form: FormData): Promise<Estado> {
  await exigirPapel("admin");
  const r = esquemaTeste.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: r.error.issues[0].message };
  const { criterios_texto, tabela_padrao_id, ...d } = r.data;
  const criterios = d.tipo === "criterios" ? lerCriterios(criterios_texto) : null;
  if (criterios && (!criterios.length || criterios.some((c) => !c.nome || !(c.max > 0)))) {
    return { erro: 'Critérios: uma linha por critério no formato "Nome:pontuação máxima"' };
  }
  const linha = {
    ...d,
    criterios,
    protocolo: d.protocolo?.trim() || null,
    tabela_padrao_id: tabela_padrao_id || null,
    ...(d.tipo === "criterios" ? { tentativas: 1, por_lado: false } : {}),
  };
  const supabase = await clienteServidor();
  const { error } = testeId
    ? await supabase.from("testes").update(linha).eq("id", testeId)
    : await supabase.from("testes").insert({ ...linha, padrao: false, ativo: true });
  if (error) return { erro: "Não foi possível salvar o teste" };
  revalidatePath("/treinador/testes");
  return { ok: "Teste salvo" };
}
