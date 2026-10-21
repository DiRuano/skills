"use client";
import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Aviso, Cartao } from "@/components/ui/cartao";
import { AreaTexto, Campo, Entrada } from "@/components/ui/formulario";
import { campoCriterio, campoTentativa, ladosDoTeste, type TesteForm } from "@/lib/resultados";
import { hojeSP } from "@/lib/idade";
import { registrarAvaliacao, type EstadoAvaliacao } from "./acoes";

type TesteTela = TesteForm & { unidade: string; protocolo: string | null; categoria: string };

const NOME_LADO = { unico: "", D: "Direito", E: "Esquerdo" } as const;

function CampoNumero({ nome, rotulo, unidade, padrao }: { nome: string; rotulo: string; unidade: string; padrao?: number | null }) {
  return (
    <Campo rotulo={`${rotulo} (${unidade})`} nome={nome}>
      <Entrada id={nome} name={nome} inputMode="decimal" defaultValue={padrao ?? undefined} autoComplete="off" />
    </Campo>
  );
}

export function FormularioAvaliacao({
  alunoId,
  testes,
  familia,
}: {
  alunoId: string;
  testes: TesteTela[];
  familia: { estatura_mae_cm: number | null; estatura_pai_cm: number | null } | null;
}) {
  const [estado, acao, enviando] = useActionState<EstadoAvaliacao, FormData>(registrarAvaliacao.bind(null, alunoId), {});

  return (
    <form action={acao} className="space-y-5">
      <Cartao className="space-y-4">
        <h2 className="text-lg font-semibold">Antropometria</h2>
        <Campo rotulo="Data da avaliação" nome="data">
          <Entrada id="data" name="data" type="date" defaultValue={hojeSP()} max={hojeSP()} required />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <CampoNumero nome="massa_kg" rotulo="Massa" unidade="kg" />
          <CampoNumero nome="estatura_cm" rotulo="Estatura" unidade="cm" />
          <CampoNumero nome="altura_sentado_cm" rotulo="Altura sentado" unidade="cm" />
          <CampoNumero nome="envergadura_cm" rotulo="Envergadura" unidade="cm" />
        </div>
        <p className="text-xs text-suave">
          Altura sentado: medida do banco ao topo da cabeça (sem a altura do banco). Necessária para estimar a maturação.
        </p>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Estatura dos pais biológicos (opcional)</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <CampoNumero nome="estatura_mae_cm" rotulo="Mãe" unidade="cm" padrao={familia?.estatura_mae_cm} />
            <CampoNumero nome="estatura_pai_cm" rotulo="Pai" unidade="cm" padrao={familia?.estatura_pai_cm} />
          </div>
          <p className="mt-2 text-xs text-suave">Usada na predição de estatura adulta (Khamis-Roche).</p>
        </details>
      </Cartao>

      {testes.map((t) => (
        <Cartao key={t.id} className="space-y-3">
          <div>
            <h3 className="font-semibold">{t.nome}</h3>
            <p className="text-xs text-suave">
              {t.unidade} · {t.maior_melhor ? "maior é melhor" : "menor é melhor"}
              {t.tipo === "numerico" && ` · ${t.tentativas} tentativa(s), conta a ${t.criterio === "melhor" ? "melhor" : "média"}`}
            </p>
            {t.protocolo && (
              <details className="mt-1 text-xs text-suave">
                <summary className="cursor-pointer">Protocolo</summary>
                <p className="mt-1">{t.protocolo}</p>
              </details>
            )}
          </div>
          {t.tipo === "criterios" ? (
            <div className="grid grid-cols-2 gap-3">
              {(t.criterios ?? []).map((c, i) => (
                <Campo key={c.nome} rotulo={`${c.nome} (0–${c.max})`} nome={campoCriterio(t.id, i)}>
                  <Entrada id={campoCriterio(t.id, i)} name={campoCriterio(t.id, i)} inputMode="decimal" autoComplete="off" />
                </Campo>
              ))}
            </div>
          ) : (
            ladosDoTeste(t).map((lado) => (
              <div key={lado}>
                {lado !== "unico" && <p className="mb-1 text-sm font-medium">{NOME_LADO[lado]}</p>}
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: t.tentativas }, (_, i) => (
                    <Entrada
                      key={i}
                      name={campoTentativa(t.id, lado, i)}
                      inputMode="decimal"
                      placeholder={`${i + 1}ª`}
                      aria-label={`${t.nome} ${NOME_LADO[lado]} tentativa ${i + 1}`}
                      autoComplete="off"
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </Cartao>
      ))}

      <Cartao>
        <Campo rotulo="Observações" nome="observacoes">
          <AreaTexto id="observacoes" name="observacoes" placeholder="Condições do dia, comportamento, ajustes de protocolo" />
        </Campo>
      </Cartao>

      {estado.erros?.length ? (
        <Aviso tom="perigo" titulo="Corrija antes de salvar">
          <ul className="list-disc pl-4">
            {estado.erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Aviso>
      ) : null}
      <Botao type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar avaliação"}
      </Botao>
      <p className="text-center text-xs text-suave">Testes deixados em branco não são registrados.</p>
    </form>
  );
}
