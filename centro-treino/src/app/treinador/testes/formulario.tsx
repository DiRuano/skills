"use client";
import { useActionState, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Aviso } from "@/components/ui/cartao";
import { AreaTexto, Campo, Entrada, Selecao } from "@/components/ui/formulario";
import type { Teste } from "@/lib/avaliacao";
import { salvarTeste, type Estado } from "./acoes";

export function FormTeste({ teste, tabelas }: { teste?: Teste; tabelas: { id: string; nome: string }[] }) {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(salvarTeste.bind(null, teste?.id ?? null), {});
  const [tipo, setTipo] = useState(teste?.tipo ?? "numerico");
  const p = (n: string) => `${n}-${teste?.id ?? "novo"}`;

  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-2">
      <Campo rotulo="Nome" nome={p("nome")}>
        <Entrada id={p("nome")} name="nome" defaultValue={teste?.nome} required />
      </Campo>
      <Campo rotulo="Categoria" nome={p("categoria")}>
        <Entrada id={p("categoria")} name="categoria" defaultValue={teste?.categoria ?? "outro"} />
      </Campo>
      <Campo rotulo="Unidade" nome={p("unidade")}>
        <Entrada id={p("unidade")} name="unidade" defaultValue={teste?.unidade} placeholder="cm, s, kgf, repetições" required />
      </Campo>
      <Campo rotulo="Tipo" nome={p("tipo")}>
        <Selecao id={p("tipo")} name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "numerico" | "criterios")}>
          <option value="numerico">Numérico (tentativas)</option>
          <option value="criterios">Pontuação por critérios</option>
        </Selecao>
      </Campo>
      <Campo rotulo="Sentido" nome={p("maior_melhor")}>
        <Selecao id={p("maior_melhor")} name="maior_melhor" defaultValue={teste?.maior_melhor === false ? "nao" : "sim"}>
          <option value="sim">Maior é melhor</option>
          <option value="nao">Menor é melhor</option>
        </Selecao>
      </Campo>
      {tipo === "numerico" ? (
        <>
          <Campo rotulo="Tentativas" nome={p("tentativas")}>
            <Entrada id={p("tentativas")} name="tentativas" type="number" min={1} max={10} defaultValue={teste?.tentativas ?? 1} />
          </Campo>
          <Campo rotulo="Qual tentativa conta" nome={p("criterio")}>
            <Selecao id={p("criterio")} name="criterio" defaultValue={teste?.criterio ?? "melhor"}>
              <option value="melhor">A melhor</option>
              <option value="media">A média</option>
            </Selecao>
          </Campo>
          <label className="flex items-center gap-3 self-end py-3 text-sm">
            <input type="checkbox" name="por_lado" defaultChecked={teste?.por_lado} className="size-5 accent-primaria" />
            Registrar lado direito e esquerdo
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name="tentativas" value="1" />
          <input type="hidden" name="criterio" value="melhor" />
          <div className="sm:col-span-2">
            <Campo rotulo="Critérios (um por linha, Nome:máximo)" nome={p("criterios")}>
              <AreaTexto
                id={p("criterios")}
                name="criterios_texto"
                defaultValue={teste?.criterios?.map((c) => `${c.nome}:${c.max}`).join("\n")}
                placeholder={"Agachamento:3\nHop unipodal direito:3"}
              />
            </Campo>
          </div>
        </>
      )}
      <div className="sm:col-span-2">
        <Campo rotulo="Protocolo" nome={p("protocolo")}>
          <AreaTexto id={p("protocolo")} name="protocolo" defaultValue={teste?.protocolo ?? ""} />
        </Campo>
      </div>
      {teste && (
        <div className="sm:col-span-2">
          <Campo rotulo="Tabela de referência padrão" nome={p("tabela")} dica="Usada em todas as comparações deste teste.">
            <Selecao id={p("tabela")} name="tabela_padrao_id" defaultValue={teste.tabela_padrao_id ?? ""}>
              <option value="">Nenhuma (mostra &quot;sem referência cadastrada&quot;)</option>
              {tabelas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Selecao>
          </Campo>
        </div>
      )}
      <div className="space-y-2 sm:col-span-2">
        {estado.erro && <Aviso tom="perigo" titulo={estado.erro} />}
        {estado.ok && <Aviso tom="sucesso" titulo={estado.ok} />}
        <Botao type="submit" variante="secundario" disabled={enviando}>{teste ? "Salvar" : "Criar teste"}</Botao>
      </div>
    </form>
  );
}
