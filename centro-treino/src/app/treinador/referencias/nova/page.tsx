import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { FormTabela } from "./formulario";

// Fontes sugeridas como primeira opção. O treinador digita os valores a partir
// do artigo original e confere a citação antes de salvar.
const SUGESTOES = [
  {
    nome: "Tomkinson et al. (2018) — valores normativos europeus, 9–17 anos",
    testes: "preensão manual, salto horizontal, sprint, vai-e-vem 20 m, entre outros",
    citacao:
      "Tomkinson GR, Carver KD, Atkinson F, et al. European normative values for physical fitness in children and adolescents aged 9–17 years: results from 2 779 165 Eurofit performances representing 30 countries. Br J Sports Med. 2018;52(22):1445-1456. doi:10.1136/bjsports-2017-098253",
  },
  {
    nome: "PROESP-Br — Projeto Esporte Brasil",
    testes: "referências brasileiras para aptidão física relacionada à saúde e ao desempenho",
    citacao: "Use o manual PROESP-Br mais recente (UFRGS) e copie a citação exata da edição consultada.",
  },
  {
    nome: "Bateria ALPHA-FIT",
    testes: "protocolos e referências de aptidão relacionada à saúde",
    citacao:
      "Ruiz JR, Castro-Piñero J, España-Romero V, et al. Field-based fitness assessment in young people: the ALPHA health-related fitness test battery for children and adolescents. Br J Sports Med. 2011;45(6):518-524. doi:10.1136/bjsm.2010.075341",
  },
  {
    nome: "FITNESSGRAM",
    testes: "zonas de aptidão saudável (Healthy Fitness Zone)",
    citacao: "The Cooper Institute. FITNESSGRAM Administration Manual — copie a edição e o ano consultados.",
  },
];

export default async function NovaTabela({ searchParams }: { searchParams: Promise<{ teste?: string }> }) {
  const { teste } = await searchParams;
  const supabase = await clienteServidor();
  const { data: testes } = await supabase.from("testes").select("id, nome").order("ordem");
  return (
    <div className="space-y-4">
      <Link href="/treinador/referencias" className="text-sm text-suave underline">← Tabelas de referência</Link>
      <h1 className="text-2xl font-bold">Nova tabela de referência</h1>
      <details className="rounded-2xl border border-borda bg-superficie p-4">
        <summary className="cursor-pointer font-medium">Fontes sugeridas</summary>
        <ul className="mt-3 space-y-3 text-sm">
          {SUGESTOES.map((s) => (
            <li key={s.nome}>
              <p className="font-semibold">{s.nome}</p>
              <p className="text-suave">{s.testes}</p>
              <p className="mt-1 text-xs text-suave">{s.citacao}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-alerta">Confira cada citação no artigo antes de salvar.</p>
      </details>
      <FormTabela testes={testes ?? []} testeInicial={teste} />
    </div>
  );
}
