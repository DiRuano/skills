import Link from "next/link";
import { Download } from "lucide-react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { formatarDataHora } from "@/lib/idade";
import type { Aluno, ConsentimentoAtual } from "@/lib/tipos";
import { Cartao, Selo } from "@/components/ui/cartao";
import { Botao, classeBotao } from "@/components/ui/botao";
import { alterarConsentimento } from "@/app/consentimento/[alunoId]/acoes";
import { FormExclusao } from "./componentes";

const ROTULOS = { dados_menor: "Tratamento de dados", imagem: "Uso de imagem e vídeo" } as const;

export default async function Privacidade() {
  const supabase = await clienteServidor();
  const [{ data: filhos }, { data: consent }, { data: pedidos }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome"),
    supabase.from("consentimentos_atuais").select("*"),
    supabase.from("solicitacoes_exclusao").select("aluno_id, status, criado_em"),
  ]);
  const chave = (a: string, t: string) => `${a}:${t}`;
  const mapa = new Map((consent as ConsentimentoAtual[] | null)?.map((c) => [chave(c.aluno_id, c.tipo), c]));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Consentimentos e privacidade</h1>
      <p className="text-suave">
        Você controla os dados dos seus filhos. Veja a{" "}
        <Link href="/privacidade" className="underline">política de privacidade</Link>.
      </p>

      {(filhos as Aluno[] | null)?.map((f) => {
        const pedido = pedidos?.find((p) => p.aluno_id === f.id && p.status !== "recusada");
        return (
          <Cartao key={f.id} className="space-y-5">
            <h2 className="text-xl font-semibold">{f.nome}</h2>

            <section className="space-y-3">
              <h3 className="font-semibold">Autorizações</h3>
              {(Object.keys(ROTULOS) as (keyof typeof ROTULOS)[]).map((tipo) => {
                const c = mapa.get(chave(f.id, tipo));
                const ativo = c?.valido ?? false;
                return (
                  <div key={tipo} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-superficie-2 p-3">
                    <div>
                      <p className="font-medium">{ROTULOS[tipo]}</p>
                      <p className="text-xs text-suave">
                        {c ? `${c.concedido ? "Concedido" : "Revogado"} em ${formatarDataHora(c.registrado_em)} · termo v${c.versao}` : "Ainda não respondido"}
                      </p>
                    </div>
                    {c ? (
                      <form action={alterarConsentimento.bind(null, f.id, tipo, !ativo)}>
                        <Botao type="submit" variante={ativo ? "secundario" : "primario"} className="min-h-10 text-sm">
                          {ativo ? "Revogar" : "Autorizar"}
                        </Botao>
                      </form>
                    ) : (
                      <Link href={`/consentimento/${f.id}`} className={classeBotao("primario", "min-h-10 text-sm")}>Responder</Link>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-suave">
                Revogar o tratamento de dados suspende avaliações e treinos. Revogar o uso de imagem apaga a foto.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Baixar todos os dados</h3>
              <a href={`/api/exportar/${f.id}`} className={classeBotao("secundario")}>
                <Download className="size-4" /> Baixar (JSON)
              </a>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Excluir dados</h3>
              {pedido ? (
                <Selo tom="alerta">Pedido de exclusão {pedido.status === "pendente" ? "pendente" : "em andamento"}</Selo>
              ) : (
                <FormExclusao alunoId={f.id} nome={f.nome} />
              )}
            </section>
          </Cartao>
        );
      })}
    </div>
  );
}
