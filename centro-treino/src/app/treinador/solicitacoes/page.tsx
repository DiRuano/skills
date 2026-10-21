import { clienteServidor } from "@/lib/supabase/servidor";
import { formatarDataHora } from "@/lib/idade";
import { Aviso, Cartao, Selo } from "@/components/ui/cartao";
import { Botao } from "@/components/ui/botao";
import { Entrada } from "@/components/ui/formulario";
import { concluirExclusao, recusarExclusao } from "./acoes";

type Solicitacao = {
  id: string;
  aluno_nome: string;
  motivo: string | null;
  status: string;
  resposta: string | null;
  criado_em: string;
  perfis: { nome: string; email: string } | null;
};

export default async function Solicitacoes() {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("solicitacoes_exclusao")
    .select("id, aluno_nome, motivo, status, resposta, criado_em, perfis(nome, email)")
    .order("criado_em", { ascending: false });
  const lista = (data ?? []) as unknown as Solicitacao[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Solicitações LGPD</h1>
      <Aviso tom="alerta" titulo="Regra de retenção a confirmar">
        Hoje a exclusão apaga o aluno e todo o histórico (inclusive registros de consentimento). Confirme com a
        assessoria jurídica se algo deve ser mantido por prazo legal antes de usar em produção.
      </Aviso>
      {!lista.length && <p className="text-suave">Nenhum pedido.</p>}
      {lista.map((s) => (
        <Cartao key={s.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Excluir dados de {s.aluno_nome}</p>
            <Selo tom={s.status === "pendente" ? "alerta" : "neutro"}>{s.status}</Selo>
          </div>
          <p className="text-sm text-suave">
            Pedido por {s.perfis?.nome || s.perfis?.email} em {formatarDataHora(s.criado_em)}
            {s.motivo ? ` — “${s.motivo}”` : ""}
          </p>
          {s.resposta && <p className="text-sm">Resposta: {s.resposta}</p>}
          {s.status === "pendente" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <form action={concluirExclusao.bind(null, s.id)}>
                <Botao type="submit" variante="perigo">Excluir definitivamente</Botao>
              </form>
              <form action={recusarExclusao.bind(null, s.id)} className="flex flex-1 gap-2">
                <Entrada name="resposta" placeholder="Motivo da recusa (obrigatório)" aria-label="Motivo da recusa" required />
                <Botao type="submit" variante="secundario">Recusar</Botao>
              </form>
            </div>
          )}
        </Cartao>
      ))}
    </div>
  );
}
