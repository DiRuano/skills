"use client";
import { useActionState } from "react";
import { Send } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Aviso } from "@/components/ui/cartao";
import { enviarAosResponsaveis, type EstadoEnvio } from "./acoes";

export function BotaoEnviar({ avaliacaoId }: { avaliacaoId: string }) {
  const [estado, acao, enviando] = useActionState<EstadoEnvio>(enviarAosResponsaveis.bind(null, avaliacaoId), {});
  return (
    <form action={acao} className="space-y-2">
      <Botao type="submit" disabled={enviando}>
        <Send className="size-4" /> {enviando ? "Enviando..." : "Enviar ao responsável"}
      </Botao>
      {estado.erro && <Aviso tom="perigo" titulo={estado.erro} />}
      {estado.ok && <Aviso tom="sucesso" titulo={estado.ok} />}
    </form>
  );
}
