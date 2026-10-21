"use client";
import { useActionState, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada } from "@/components/ui/formulario";
import { Aviso } from "@/components/ui/cartao";
import { entrarComLink, entrarComSenha, type EstadoEntrar } from "./acoes";

export function FormularioEntrar({ voltar }: { voltar: string }) {
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const [estadoSenha, acaoSenha, enviandoSenha] = useActionState<EstadoEntrar, FormData>(entrarComSenha, {});
  const [estadoLink, acaoLink, enviandoLink] = useActionState<EstadoEntrar, FormData>(entrarComLink, {});
  const estado = modo === "senha" ? estadoSenha : estadoLink;

  return (
    <form action={modo === "senha" ? acaoSenha : acaoLink} className="space-y-4">
      <input type="hidden" name="voltar" value={voltar} />
      <Campo rotulo="E-mail" nome="email">
        <Entrada id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Campo>
      {modo === "senha" && (
        <Campo rotulo="Senha" nome="senha">
          <Entrada id="senha" name="senha" type="password" autoComplete="current-password" required />
        </Campo>
      )}
      {estado.erro && <Aviso tom="perigo" titulo={estado.erro} />}
      {estado.mensagem && <Aviso tom="sucesso" titulo={estado.mensagem} />}
      <Botao type="submit" className="w-full" disabled={enviandoSenha || enviandoLink}>
        {modo === "senha" ? "Entrar" : "Receber link por e-mail"}
      </Botao>
      <button
        type="button"
        onClick={() => setModo(modo === "senha" ? "link" : "senha")}
        className="w-full py-2 text-sm text-suave underline underline-offset-2"
      >
        {modo === "senha" ? "Entrar sem senha (link por e-mail)" : "Entrar com senha"}
      </button>
    </form>
  );
}
