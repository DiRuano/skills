"use client";
import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Aviso, Cartao } from "@/components/ui/cartao";
import type { Termo } from "@/lib/tipos";
import { registrarConsentimento, type EstadoConsentimento } from "./acoes";

function TextoTermo({ termo }: { termo: Termo }) {
  return (
    <details className="rounded-xl border border-borda bg-superficie-2 p-3">
      <summary className="cursor-pointer text-sm font-medium">Ler o texto completo (versão {termo.versao})</summary>
      <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-line text-sm text-suave">{termo.conteudo}</div>
    </details>
  );
}

export function FormularioConsentimento({
  alunoId,
  nomeAluno,
  titular,
  termos,
}: {
  alunoId: string;
  nomeAluno: string;
  titular: boolean;
  termos: Record<"dados_menor" | "imagem" | "termos_uso" | "privacidade", Termo>;
}) {
  const [estado, acao, enviando] = useActionState<EstadoConsentimento, FormData>(registrarConsentimento, {});
  const e = estado.erros ?? {};
  const sujeito = titular ? "meus dados" : `os dados de ${nomeAluno}`;

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="aluno_id" value={alunoId} />
      {Object.values(termos).map((t) => (
        <input key={t.tipo} type="hidden" name={`hash_${t.tipo}`} value={t.hash_conteudo} />
      ))}

      {/* 1. Consentimento específico e destacado (art. 14, §1º) */}
      <Cartao className="space-y-3 border-primaria/50">
        <p className="text-xs font-semibold tracking-wide text-primaria uppercase">Obrigatório</p>
        <h2 className="text-lg font-semibold">{termos.dados_menor.titulo}</h2>
        <TextoTermo termo={termos.dados_menor} />
        <label className="flex items-start gap-3 rounded-xl bg-superficie-2 p-3">
          <input type="checkbox" name="dados" value="sim" className="mt-1 size-5 shrink-0 accent-primaria" />
          <span className="text-sm">
            Li e <strong>autorizo</strong> o tratamento de {sujeito}, inclusive dados de saúde, para as
            finalidades descritas. Também li a{" "}
            <a href="/privacidade" target="_blank" className="underline">política de privacidade</a> e os{" "}
            <a href="/termos" target="_blank" className="underline">termos de uso</a>.
          </span>
        </label>
        {e.dados && <p className="text-sm text-perigo" role="alert">{e.dados}</p>}
      </Cartao>

      {/* 2. Consentimento separado e opcional para imagem */}
      <Cartao className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-suave uppercase">Opcional — separado</p>
        <h2 className="text-lg font-semibold">{termos.imagem.titulo}</h2>
        <TextoTermo termo={termos.imagem} />
        <fieldset className="space-y-2">
          <legend className="sr-only">Uso de imagem</legend>
          <label className="flex items-center gap-3 rounded-xl bg-superficie-2 p-3 text-sm">
            <input type="radio" name="imagem" value="sim" className="size-5 accent-primaria" />
            Autorizo foto e vídeos para análise técnica (não inclui redes sociais)
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-superficie-2 p-3 text-sm">
            <input type="radio" name="imagem" value="nao" defaultChecked className="size-5 accent-primaria" />
            Não autorizo
          </label>
        </fieldset>
      </Cartao>

      {e._form && <Aviso tom="perigo" titulo={e._form} />}
      <Botao type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Registrando..." : "Confirmar"}
      </Botao>
      <p className="text-center text-xs text-suave">
        Registramos data, hora, versão do termo e o endereço IP desta confirmação. Você pode revogar a qualquer
        momento em &quot;Consentimentos e privacidade&quot;.
      </p>
    </form>
  );
}
