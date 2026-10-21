import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { Cartao, Selo } from "@/components/ui/cartao";
import { Entrada, Selecao } from "@/components/ui/formulario";
import { Botao, classeBotao } from "@/components/ui/botao";
import { idadeAnos, hojeSP } from "@/lib/idade";
import { ROTULO_STATUS, type Aluno } from "@/lib/tipos";

type Filtros = { busca?: string; status?: string; sexo?: string; modalidade?: string; idade_min?: string; idade_max?: string };

/** Data de nascimento limite para uma idade em anos completos (hoje em SP). */
function nascimentoParaIdade(idade: number, limite: "min" | "max") {
  const [a, m, d] = hojeSP().split("-").map(Number);
  // idade >= N  ⇔ nascimento <= hoje - N anos
  // idade <= N  ⇔ nascimento >  hoje - (N+1) anos
  const ano = limite === "min" ? a - idade : a - idade - 1;
  return `${ano}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default async function ListaAlunos({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const supabase = await clienteServidor();

  let q = supabase
    .from("alunos")
    .select("id, nome, data_nascimento, sexo_biologico, modalidade, status")
    .order("nome");
  if (f.busca) q = q.ilike("nome", `%${f.busca.replace(/[%_]/g, "")}%`);
  if (f.status) q = q.eq("status", f.status);
  if (f.sexo) q = q.eq("sexo_biologico", f.sexo);
  if (f.modalidade) q = q.ilike("modalidade", `%${f.modalidade.replace(/[%_]/g, "")}%`);
  if (f.idade_min) q = q.lte("data_nascimento", nascimentoParaIdade(Number(f.idade_min), "min"));
  if (f.idade_max) q = q.gt("data_nascimento", nascimentoParaIdade(Number(f.idade_max), "max"));

  const { data: alunos, error } = await q;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Alunos</h1>
        <Link href="/treinador/alunos/novo" className={classeBotao()}>+ Novo aluno</Link>
      </div>

      <details className="rounded-2xl border border-borda bg-superficie p-4" open={Object.keys(f).length > 0}>
        <summary className="cursor-pointer font-medium">Filtros</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-3">
          <Entrada name="busca" placeholder="Buscar por nome" defaultValue={f.busca} aria-label="Buscar por nome" />
          <Selecao name="status" defaultValue={f.status ?? ""} aria-label="Situação">
            <option value="">Todas as situações</option>
            {Object.entries(ROTULO_STATUS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Selecao>
          <Selecao name="sexo" defaultValue={f.sexo ?? ""} aria-label="Sexo">
            <option value="">Ambos os sexos</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </Selecao>
          <Entrada name="modalidade" placeholder="Modalidade" defaultValue={f.modalidade} aria-label="Modalidade" />
          <Entrada name="idade_min" type="number" min={4} max={40} placeholder="Idade mínima" defaultValue={f.idade_min} aria-label="Idade mínima" />
          <Entrada name="idade_max" type="number" min={4} max={40} placeholder="Idade máxima" defaultValue={f.idade_max} aria-label="Idade máxima" />
          <div className="flex gap-2 sm:col-span-3">
            <Botao type="submit">Filtrar</Botao>
            <Link href="/treinador/alunos" className={classeBotao("fantasma")}>Limpar</Link>
          </div>
        </form>
      </details>

      {error && <p className="text-perigo">Erro ao carregar alunos.</p>}
      {alunos?.length === 0 && <p className="text-suave">Nenhum aluno encontrado.</p>}
      <ul className="space-y-2">
        {(alunos as Aluno[] | null)?.map((a) => (
          <li key={a.id}>
            <Link href={`/treinador/alunos/${a.id}`}>
              <Cartao className="flex items-center justify-between gap-3 hover:bg-superficie-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.nome}</p>
                  <p className="text-sm text-suave">
                    {idadeAnos(a.data_nascimento)} anos · {a.sexo_biologico === "M" ? "Masc." : "Fem."}
                    {a.modalidade ? ` · ${a.modalidade}` : ""}
                  </p>
                </div>
                <Selo tom={a.status === "ativo" ? "sucesso" : a.status === "inativo" ? "neutro" : "alerta"}>
                  {ROTULO_STATUS[a.status]}
                </Selo>
              </Cartao>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
