"use client";
import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, Entrada } from "@/components/ui/formulario";
import { Aviso } from "@/components/ui/cartao";
import { RodapeLegal } from "@/components/rodape-legal";
import { definirSenha } from "./acoes";

export default function DefinirSenha() {
  const [estado, acao, enviando] = useActionState(definirSenha, {});
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Crie sua senha</h1>
      <p className="mt-1 mb-6 text-suave">Você vai usar esta senha para entrar no app.</p>
      <form action={acao} className="space-y-4">
        <Campo rotulo="Nova senha" nome="senha" dica="Mínimo de 8 caracteres">
          <Entrada id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
        </Campo>
        <Campo rotulo="Repita a senha" nome="confirmacao">
          <Entrada id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
        </Campo>
        {estado.erro && <Aviso tom="perigo" titulo={estado.erro} />}
        <Botao type="submit" className="w-full" disabled={enviando}>Salvar e continuar</Botao>
      </form>
      <RodapeLegal />
    </main>
  );
}
