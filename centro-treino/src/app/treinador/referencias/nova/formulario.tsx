"use client";
import { useActionState, useState } from "react";
import { Download } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Aviso, Cartao } from "@/components/ui/cartao";
import { AreaTexto, Campo, Entrada, Selecao } from "@/components/ui/formulario";
import { criarTabela, type EstadoTabela } from "../acoes";

export function FormTabela({ testes, testeInicial }: { testes: { id: string; nome: string }[]; testeInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoTabela, FormData>(criarTabela, {});
  const [tipo, setTipo] = useState<"percentil" | "zona">("percentil");

  return (
    <form action={acao} className="space-y-4">
      <Cartao className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Teste" nome="teste_id">
          <Selecao id="teste_id" name="teste_id" defaultValue={testeInicial ?? ""} required>
            <option value="">Selecione</option>
            {testes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Nome da tabela" nome="nome">
          <Entrada id="nome" name="nome" placeholder="Ex.: Tomkinson 2018 — Europa" required />
        </Campo>
        <Campo rotulo="População" nome="populacao">
          <Entrada id="populacao" name="populacao" placeholder="Ex.: europeia, brasileira" required />
        </Campo>
        <Campo rotulo="Formato" nome="tipo">
          <Selecao id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "percentil" | "zona")}>
            <option value="percentil">Percentis (P5, P10, ... P95)</option>
            <option value="zona">Zonas (fraco, razoável, bom...)</option>
          </Selecao>
        </Campo>
        <div className="sm:col-span-2">
          <Campo rotulo="Citação completa" nome="citacao" dica="Autores. Título. Revista. Ano;volume(número):páginas.">
            <AreaTexto id="citacao" name="citacao" required />
          </Campo>
        </div>
        <Campo rotulo="DOI ou link" nome="doi_url">
          <Entrada id="doi_url" name="doi_url" placeholder="doi:10..." />
        </Campo>
        <Campo rotulo="Ano" nome="ano">
          <Entrada id="ano" name="ano" type="number" min={1900} max={2100} />
        </Campo>
        <Campo rotulo="Nível de confiança" nome="nivel_confianca">
          <Selecao id="nivel_confianca" name="nivel_confianca" required>
            <option value="meta_analise">Meta-análise</option>
            <option value="populacional">Grande amostra populacional</option>
            <option value="local">Amostra local</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Observações" nome="observacoes">
          <Entrada id="observacoes" name="observacoes" placeholder="Protocolo, unidade, tabela do artigo" />
        </Campo>
      </Cartao>

      <Cartao className="space-y-3">
        <h2 className="font-semibold">Valores</h2>
        <a href={`/api/modelo-csv?tipo=${tipo}`} className="inline-flex items-center gap-2 text-sm underline">
          <Download className="size-4" /> Baixar modelo CSV ({tipo === "percentil" ? "percentis" : "zonas"})
        </a>
        <p className="text-xs text-suave">
          {tipo === "percentil"
            ? "Uma linha por sexo (M/F) e faixa etária. idade_min entra na faixa e idade_max não (9 e 10 = de 9,00 a 9,99 anos). Pode apagar ou acrescentar colunas de percentil. Em testes de tempo, copie os valores como estão no artigo: o app detecta se o P95 é o tempo maior ou o menor."
            : "Uma linha por zona. min entra na zona e max não; deixe em branco para zona aberta."}
        </p>
        <Entrada name="arquivo" type="file" accept=".csv,text/csv" className="py-2.5" aria-label="Arquivo CSV" />
        <Campo rotulo="…ou cole o CSV" nome="csv_texto">
          <AreaTexto id="csv_texto" name="csv_texto" className="font-mono text-sm" />
        </Campo>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="usar_como_padrao" defaultChecked className="size-5 accent-primaria" />
          Usar como tabela padrão deste teste
        </label>
      </Cartao>

      {estado.erros?.length ? (
        <Aviso tom="perigo" titulo="Corrija antes de salvar">
          <ul className="list-disc pl-4">{estado.erros.map((e) => <li key={e}>{e}</li>)}</ul>
        </Aviso>
      ) : null}
      <Botao type="submit" className="w-full" disabled={enviando}>{enviando ? "Importando..." : "Salvar tabela"}</Botao>
    </form>
  );
}
