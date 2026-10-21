"use server";
import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/servidor";
import { lerCsv, numero } from "@/lib/csv";

export type Estado = { erro?: string; ok?: string };

async function gravar(chave: string, valor: unknown, citacao: string | null, usuario: string) {
  const supabase = await clienteServidor();
  return supabase.from("parametros").upsert({ chave, valor, citacao, atualizado_por: usuario, atualizado_em: new Date().toISOString() });
}

export async function salvarMaturacao(_: Estado, form: FormData): Promise<Estado> {
  const perfil = await exigirPapel("admin");
  const equacao = form.get("equacao") === "mirwald_2002" ? "mirwald_2002" : "moore_2015";
  const inicio = numero(String(form.get("inicio_circa") ?? ""));
  const fim = numero(String(form.get("fim_circa") ?? ""));
  if (inicio == null || fim == null || inicio >= fim) return { erro: "Limiares inválidos: início do circa-PHV precisa ser menor que o fim" };

  const aphvM = numero(String(form.get("aphv_m") ?? ""));
  const aphvF = numero(String(form.get("aphv_f") ?? ""));
  const citacao = String(form.get("aphv_citacao") ?? "").trim();
  if ((aphvM != null || aphvF != null) && citacao.length < 10) {
    return { erro: "Informe a citação da idade de PHV de referência" };
  }
  for (const v of [aphvM, aphvF]) if (v != null && (v < 9 || v > 17)) return { erro: "Idade de PHV de referência fora de 9–17 anos" };

  const r = await Promise.all([
    gravar("equacao_maturacao", equacao, null, perfil.id),
    gravar("limiares_fase", { inicioCirca: inicio, fimCirca: fim }, String(form.get("limiares_citacao") ?? "").trim() || null, perfil.id),
    gravar("aphv_referencia", { M: aphvM, F: aphvF }, citacao || null, perfil.id),
  ]);
  if (r.some((x) => x.error)) return { erro: "Não foi possível salvar" };
  revalidatePath("/treinador", "layout");
  return { ok: "Parâmetros salvos" };
}

/** Importa os coeficientes de Khamis-Roche copiados do artigo (substitui os atuais). */
export async function importarKhamisRoche(_: Estado, form: FormData): Promise<Estado> {
  const perfil = await exigirPapel("admin");
  const citacao = String(form.get("citacao") ?? "").trim();
  if (citacao.length < 10) return { erro: "Informe a citação da tabela de coeficientes" };
  const arquivo = form.get("arquivo");
  const texto = arquivo instanceof File && arquivo.size > 0 ? await arquivo.text() : String(form.get("csv_texto") ?? "");
  const linhas = lerCsv(texto);
  if (linhas.length < 2) return { erro: "CSV vazio" };
  const cab = linhas[0].map((c) => c.toLowerCase());
  const cols = ["sexo", "idade", "intercepto", "coef_estatura", "coef_massa", "coef_estatura_pais"];
  if (cols.some((c) => !cab.includes(c))) return { erro: `Colunas necessárias: ${cols.join(", ")}` };
  const reg = [];
  for (const [i, l] of linhas.slice(1).entries()) {
    const v = Object.fromEntries(cols.map((c) => [c, l[cab.indexOf(c)]]));
    const sexo = String(v.sexo).toUpperCase();
    const nums = cols.slice(1).map((c) => numero(v[c]));
    if ((sexo !== "M" && sexo !== "F") || nums.some((n) => n == null)) return { erro: `Linha ${i + 2}: valores incompletos` };
    const [idade, intercepto, coef_estatura, coef_massa, coef_estatura_pais] = nums as number[];
    reg.push({ sexo, idade, intercepto, coef_estatura, coef_massa, coef_estatura_pais });
  }
  const supabase = await clienteServidor();
  await supabase.from("khamis_roche_coeficientes").delete().in("sexo", ["M", "F"]);
  const { error } = await supabase.from("khamis_roche_coeficientes").insert(reg);
  if (error) return { erro: "Não foi possível salvar (idades repetidas?)" };
  await gravar("khamis_roche", {}, citacao, perfil.id);
  revalidatePath("/treinador/configuracoes");
  return { ok: `${reg.length} linhas importadas` };
}
