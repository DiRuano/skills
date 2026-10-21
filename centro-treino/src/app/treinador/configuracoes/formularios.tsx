"use client";
import { useActionState } from "react";
import { Download } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Aviso } from "@/components/ui/cartao";
import { AreaTexto, Campo, Entrada, Selecao } from "@/components/ui/formulario";
import { importarKhamisRoche, salvarMaturacao, type Estado } from "./acoes";

function Retorno({ e }: { e: Estado }) {
  return e.erro ? <Aviso tom="perigo" titulo={e.erro} /> : e.ok ? <Aviso tom="sucesso" titulo={e.ok} /> : null;
}

export function FormMaturacao({
  equacao,
  limiares,
  limiaresCitacao,
  aphv,
  aphvCitacao,
}: {
  equacao: string;
  limiares: { inicioCirca: number; fimCirca: number };
  limiaresCitacao: string | null;
  aphv: { M: number | null; F: number | null };
  aphvCitacao: string | null;
}) {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(salvarMaturacao, {});
  return (
    <form action={acao} className="space-y-4">
      <Campo rotulo="Equação usada nos relatórios" nome="equacao" dica="As duas são sempre calculadas e mostradas na ficha do treinador.">
        <Selecao id="equacao" name="equacao" defaultValue={equacao}>
          <option value="moore_2015">Moore et al. (2015) — simplificada</option>
          <option value="mirwald_2002">Mirwald et al. (2002)</option>
        </Selecao>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Circa-PHV começa em (anos)" nome="inicio_circa">
          <Entrada id="inicio_circa" name="inicio_circa" inputMode="decimal" defaultValue={limiares.inicioCirca} />
        </Campo>
        <Campo rotulo="Circa-PHV termina em (anos)" nome="fim_circa">
          <Entrada id="fim_circa" name="fim_circa" inputMode="decimal" defaultValue={limiares.fimCirca} />
        </Campo>
      </div>
      <Campo rotulo="Fonte dos limiares (opcional)" nome="limiares_citacao">
        <Entrada id="limiares_citacao" name="limiares_citacao" defaultValue={limiaresCitacao ?? ""} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Idade média do PHV — meninos" nome="aphv_m">
          <Entrada id="aphv_m" name="aphv_m" inputMode="decimal" defaultValue={aphv.M ?? ""} />
        </Campo>
        <Campo rotulo="Idade média do PHV — meninas" nome="aphv_f">
          <Entrada id="aphv_f" name="aphv_f" inputMode="decimal" defaultValue={aphv.F ?? ""} />
        </Campo>
      </div>
      <Campo rotulo="Citação da idade de PHV de referência" nome="aphv_citacao" dica="Necessária para calcular idade biológica.">
        <AreaTexto id="aphv_citacao" name="aphv_citacao" defaultValue={aphvCitacao ?? ""} />
      </Campo>
      <Retorno e={estado} />
      <Botao type="submit" variante="secundario" disabled={enviando}>Salvar</Botao>
    </form>
  );
}

export function FormKhamisRoche({ citacao }: { citacao: string | null }) {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(importarKhamisRoche, {});
  return (
    <form action={acao} className="space-y-3">
      <a href="/api/modelo-csv?tipo=khamis_roche" className="inline-flex items-center gap-2 text-sm underline">
        <Download className="size-4" /> Baixar modelo CSV
      </a>
      <p className="text-xs text-suave">
        Uma linha por sexo e idade (semestral), com os coeficientes do artigo original, nas unidades do artigo (polegadas e
        libras); o app converte cm e kg. Importar substitui a tabela atual.
      </p>
      <Campo rotulo="Citação" nome="kr_citacao">
        <AreaTexto id="kr_citacao" name="citacao" defaultValue={citacao ?? ""} required />
      </Campo>
      <Entrada name="arquivo" type="file" accept=".csv,text/csv" className="py-2.5" aria-label="Arquivo CSV" />
      <Campo rotulo="…ou cole o CSV" nome="kr_csv">
        <AreaTexto id="kr_csv" name="csv_texto" className="font-mono text-sm" />
      </Campo>
      <Retorno e={estado} />
      <Botao type="submit" variante="secundario" disabled={enviando}>Importar coeficientes</Botao>
    </form>
  );
}
