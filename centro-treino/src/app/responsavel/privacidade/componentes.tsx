"use client";
import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Aviso } from "@/components/ui/cartao";
import { AreaTexto, Campo, Entrada } from "@/components/ui/formulario";
import { solicitarExclusao, type EstadoExclusao } from "./acoes";

export function FormExclusao({ alunoId, nome }: { alunoId: string; nome: string }) {
  const [estado, acao, enviando] = useActionState<EstadoExclusao, FormData>(solicitarExclusao, {});
  if (estado.ok) {
    return <Aviso tom="sucesso" titulo="Pedido registrado">O centro vai responder pelo seu e-mail.</Aviso>;
  }
  const e = estado.erros ?? {};
  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="aluno_id" value={alunoId} />
      <p className="text-sm text-suave">
        A exclusão apaga cadastro, avaliações e treinos de {nome}. Não dá para desfazer. Registros que a lei manda
        guardar (como dados fiscais de pagamento) são mantidos pelo prazo legal.
      </p>
      <Campo rotulo="Motivo (opcional)" nome={`motivo-${alunoId}`}>
        <AreaTexto id={`motivo-${alunoId}`} name="motivo" />
      </Campo>
      <Campo rotulo='Digite "EXCLUIR" para confirmar' nome={`conf-${alunoId}`} erro={e.confirmacao}>
        <Entrada id={`conf-${alunoId}`} name="confirmacao" autoComplete="off" />
      </Campo>
      {e._form && <Aviso tom="perigo" titulo={e._form} />}
      <Botao type="submit" variante="perigo" disabled={enviando}>Pedir exclusão dos dados</Botao>
    </form>
  );
}
