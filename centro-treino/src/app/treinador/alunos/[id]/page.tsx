import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { decifrar } from "@/lib/cripto";
import { formatarData, formatarDataHora, idadeAnos } from "@/lib/idade";
import { ROTULO_STATUS, type Aluno, type ConsentimentoAtual } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Aviso, Cartao, Selo } from "@/components/ui/cartao";
import { Botao, classeBotao } from "@/components/ui/botao";
import { FormConviteAluno, FormEdicao, FormFoto, FormSaude } from "./formularios";
import { reenviarConvite } from "./acoes";
import { AbaAvaliacoes } from "./aba-avaliacoes";

const ABAS = [
  { id: "dados", rotulo: "Dados" },
  { id: "avaliacoes", rotulo: "Avaliações" },
  { id: "treino", rotulo: "Treino", fase: 3 },
  { id: "carga", rotulo: "Carga", fase: 4 },
  { id: "financeiro", rotulo: "Financeiro", fase: 5 },
] as const;

const ROTULO_CONSENTIMENTO = {
  dados_menor: "Tratamento de dados",
  imagem: "Uso de imagem",
  termos_uso: "Termos de uso",
  privacidade: "Política de privacidade",
} as const;

function faseDaAba(aba: string) {
  const a = ABAS.find((x) => x.id === aba);
  return a && "fase" in a ? a.fase : "seguinte";
}

type Vinculo = { parentesco: string; principal: boolean; perfis: { nome: string; email: string } | null };

export default async function FichaAluno({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; saude?: string; criado?: string }>;
}) {
  const { id } = await params;
  const { aba = "dados", saude, criado } = await searchParams;
  const supabase = await clienteServidor();

  const { data: aluno } = await supabase.from("alunos").select("*").eq("id", id).maybeSingle<Aluno>();
  if (!aluno) notFound();

  const [{ data: vinculos }, { data: consentimentos }] = await Promise.all([
    supabase.from("responsaveis_alunos").select("parentesco, principal, perfis(nome, email)").eq("aluno_id", id),
    supabase.from("consentimentos_atuais").select("*").eq("aluno_id", id),
  ]);
  // Sem tipos gerados, o supabase-js infere o join como lista; aqui é 1:1
  const listaVinculos = (vinculos ?? []) as unknown as Vinculo[];
  const consent = new Map((consentimentos as ConsentimentoAtual[] | null)?.map((c) => [c.tipo, c]));
  const dadosOk = consent.get("dados_menor")?.valido ?? false;
  const imagemOk = consent.get("imagem")?.valido ?? false;

  // Foto via URL assinada de curta duração (bucket privado)
  let fotoUrl: string | null = null;
  if (aluno.foto_path) {
    const { data } = await supabase.storage.from("fotos-alunos").createSignedUrl(aluno.foto_path, 300);
    fotoUrl = data?.signedUrl ?? null;
  }

  // Dados de saúde: só são lidos e decifrados quando o treinador pede, e o acesso fica registrado
  let saudeTexto: { lesoes: string; observacoes: string } | null = null;
  if (aba === "dados" && saude === "1") {
    const { data } = await supabase.from("alunos_saude").select("*").eq("aluno_id", id).maybeSingle();
    await supabase.rpc("registrar_acesso", { p_aluno_id: id, p_recurso: "alunos_saude", p_acao: "leitura" });
    saudeTexto = {
      lesoes: decifrar(data?.historico_lesoes_cifrado) ?? "",
      observacoes: decifrar(data?.observacoes_cifrado) ?? "",
    };
  }

  return (
    <div className="space-y-5">
      {criado && (
        <Aviso tom="sucesso" titulo="Aluno cadastrado">
          O convite foi enviado ao responsável. Avaliações e treinos ficam liberados depois do consentimento.
        </Aviso>
      )}

      <div className="flex items-center gap-4">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-superficie-2 text-xl font-bold text-suave">
            {aluno.nome.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{aluno.nome}</h1>
          <p className="text-sm text-suave">
            {idadeAnos(aluno.data_nascimento)} anos · nasc. {formatarData(aluno.data_nascimento)}
          </p>
          <Selo tom={aluno.status === "ativo" ? "sucesso" : "alerta"}>{ROTULO_STATUS[aluno.status]}</Selo>
        </div>
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-borda px-4" aria-label="Seções da ficha">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`?aba=${a.id}`}
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-medium",
              aba === a.id ? "border-destaque text-texto" : "border-transparent text-suave",
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {aba === "avaliacoes" ? (
        <AbaAvaliacoes alunoId={id} liberado={dadosOk} />
      ) : aba !== "dados" ? (
        <Aviso titulo="Em construção">
          Esta seção chega na Fase {faseDaAba(aba)}.
          {!dadosOk && " Ela só será liberada depois do consentimento do responsável."}
        </Aviso>
      ) : (
        <div className="space-y-4">
          {!dadosOk && (
            <Aviso tom="alerta" titulo="Aguardando consentimento">
              Sem o consentimento de tratamento de dados (LGPD, art. 14) não é possível registrar avaliações nem treinos.
            </Aviso>
          )}

          <Cartao className="space-y-4">
            <h2 className="text-lg font-semibold">Dados do aluno</h2>
            <FormEdicao aluno={aluno} />
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="text-lg font-semibold">Responsáveis</h2>
            {listaVinculos.length ? (
              <ul className="space-y-2">
                {listaVinculos.map((v) => (
                  <li key={v.perfis?.email} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {v.perfis?.nome || "(sem nome)"} <span className="text-sm text-suave">· {v.parentesco}</span>
                      </p>
                      <p className="text-sm text-suave">{v.perfis?.email}</p>
                    </div>
                    {!dadosOk && v.perfis?.email && (
                      <form action={reenviarConvite.bind(null, v.perfis.email)}>
                        <Botao type="submit" variante="fantasma" className="min-h-10 text-sm">Reenviar acesso</Botao>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-suave">Nenhum responsável vinculado (aluno maior de idade).</p>
            )}
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="text-lg font-semibold">Consentimentos</h2>
            <ul className="space-y-2 text-sm">
              {(Object.keys(ROTULO_CONSENTIMENTO) as (keyof typeof ROTULO_CONSENTIMENTO)[]).map((tipo) => {
                const c = consent.get(tipo);
                return (
                  <li key={tipo} className="flex items-center justify-between gap-2">
                    <span>{ROTULO_CONSENTIMENTO[tipo]}</span>
                    {!c ? (
                      <Selo tom="alerta">Pendente</Selo>
                    ) : c.valido ? (
                      <Selo tom="sucesso">Concedido · v{c.versao} · {formatarDataHora(c.registrado_em)}</Selo>
                    ) : !c.concedido ? (
                      <Selo tom="perigo">Recusado/revogado · {formatarDataHora(c.registrado_em)}</Selo>
                    ) : (
                      <Selo tom="alerta">Termo atualizado — novo aceite pendente</Selo>
                    )}
                  </li>
                );
              })}
            </ul>
          </Cartao>

          <Cartao className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-alerta" />
              <h2 className="text-lg font-semibold">Saúde (dado sensível)</h2>
            </div>
            {saudeTexto ? (
              <FormSaude alunoId={id} lesoes={saudeTexto.lesoes} observacoes={saudeTexto.observacoes} />
            ) : (
              <>
                <p className="text-sm text-suave">Cada visualização fica registrada no log de acesso.</p>
                <Link href="?aba=dados&saude=1" className={classeBotao("secundario")}>Ver dados de saúde</Link>
              </>
            )}
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="text-lg font-semibold">Foto</h2>
            {imagemOk ? (
              <FormFoto alunoId={id} />
            ) : (
              <p className="text-sm text-suave">Sem autorização de uso de imagem. A foto é opcional.</p>
            )}
          </Cartao>

          <Cartao className="space-y-3">
            <h2 className="text-lg font-semibold">Acesso do aluno ao app</h2>
            {aluno.usuario_id ? (
              <p className="text-sm text-suave">O aluno já tem acesso.</p>
            ) : dadosOk ? (
              <FormConviteAluno alunoId={id} />
            ) : (
              <p className="text-sm text-suave">Disponível depois do consentimento do responsável.</p>
            )}
          </Cartao>
        </div>
      )}
    </div>
  );
}
