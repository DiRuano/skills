import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Aviso, Cartao, Selo } from "@/components/ui/cartao";
import { Info } from "@/components/ui/info";
import { formatarData } from "@/lib/idade";
import {
  citacaoCurta,
  NOME_EQUACAO,
  ROTULO_LADO,
  type PontoHistorico,
  type ResultadoResumo,
  type ResumoAvaliacao,
} from "@/lib/avaliacao";
import { descreverPercentil, type Comparacao } from "@/lib/ciencia/referencia";
import { FONTE_OMS_2007 } from "@/lib/ciencia/imc";
import { FONTE_MIRWALD_2002, FONTE_MOORE_2015, ROTULO_FASE } from "@/lib/ciencia/maturacao";
import { FONTE_LEGER_1988 } from "@/lib/ciencia/aerobio";
import { LinhaDoTempo, RadarPerfil, type PontoRadar } from "./graficos";

const fmt = (n: number, casas = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas });

export function nomeResultado(r: Pick<ResultadoResumo, "teste" | "lado">) {
  return r.lado === "unico" ? r.teste.nome : `${r.teste.nome} (${ROTULO_LADO[r.lado]})`;
}

/** Texto da comparação. Nunca inventa: sem faixa cadastrada, diz isso. */
export function textoComparacao(c: Comparacao | null, simples: boolean): string {
  if (!c || c.tipo === "sem_referencia") return "sem referência cadastrada";
  if (c.tipo === "zona") return c.zona;
  const lim = c.limitado === "acima" ? "acima de " : c.limitado === "abaixo" ? "abaixo de " : "";
  const p = `${lim}P${fmt(c.percentil, 0)}`;
  return simples ? `${p} · ${descreverPercentil(c.percentil)}` : p;
}

function Linha({ rotulo, valor, info }: { rotulo: ReactNode; valor: ReactNode; info?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-borda py-2 first:border-t-0">
      <dt className="text-sm text-suave">
        {rotulo} {info}
      </dt>
      <dd className="text-right font-semibold">{valor}</dd>
    </div>
  );
}

/** Alerta de circa-PHV com sugestão de ajuste de volume. */
export function AlertaCircaPhv({ simples }: { simples: boolean }) {
  return (
    <div className="flex gap-3 rounded-xl border border-alerta/50 bg-alerta/10 p-4 text-sm" role="status">
      <AlertTriangle className="size-5 shrink-0 text-alerta" />
      <div>
        <p className="font-semibold">Fase de estirão (circa-PHV)</p>
        <p className="mt-1 text-suave">
          {simples
            ? "O corpo está crescendo rápido. Nesta fase é comum perder um pouco de coordenação por um tempo, e os ossos e tendões ficam mais sensíveis. Por isso o treino prioriza técnica e controla o volume de saltos e impactos."
            : "Período de maior risco de lesão por sobrecarga (apofisites, por exemplo) e de queda temporária de coordenação. Sugestão: reduzir volume de pliometria de alto impacto e de sprints máximos, priorizar técnica e força com controle, e monitorar dor."}
        </p>
      </div>
    </div>
  );
}

export function PainelAvaliacao({
  resumo,
  historico,
  modo,
}: {
  resumo: ResumoAvaliacao;
  historico?: Map<string, PontoHistorico[]>;
  modo: "treinador" | "responsavel";
}) {
  const simples = modo === "responsavel";
  const { avaliacao: av, imc, maturacao, crescimento, estaturaAdulta, resultados, parametros } = resumo;
  const temBiologica = maturacao?.idadeBiologica != null;

  const radar: PontoRadar[] = resultados
    .filter((r) => r.cronologica.tipo === "percentil")
    .map((r) => ({
      teste: nomeResultado(r),
      cronologica: r.cronologica.tipo === "percentil" ? Math.round(r.cronologica.percentil) : null,
      biologica: r.biologica?.tipo === "percentil" ? Math.round(r.biologica.percentil) : null,
    }));

  return (
    <div className="space-y-4">
      {maturacao?.fase === "circa_phv" && <AlertaCircaPhv simples={simples} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Cartao>
          <h2 className="mb-2 text-lg font-semibold">Medidas</h2>
          <dl>
            <Linha rotulo="Idade na avaliação" valor={`${fmt(resumo.idade)} anos`} />
            {av.massa_kg != null && <Linha rotulo="Massa" valor={`${fmt(Number(av.massa_kg))} kg`} />}
            {av.estatura_cm != null && <Linha rotulo="Estatura" valor={`${fmt(Number(av.estatura_cm))} cm`} />}
            {!simples && av.altura_sentado_cm != null && (
              <Linha rotulo="Altura sentado" valor={`${fmt(Number(av.altura_sentado_cm))} cm`} />
            )}
            {!simples && resumo.comprimentoPerna != null && (
              <Linha rotulo="Comprimento de perna" valor={`${fmt(resumo.comprimentoPerna)} cm`} />
            )}
            {!simples && av.envergadura_cm != null && <Linha rotulo="Envergadura" valor={`${fmt(Number(av.envergadura_cm))} cm`} />}
            {imc && (
              <Linha
                rotulo="IMC"
                info={
                  <Info titulo="IMC por idade" fonte={FONTE_OMS_2007}>
                    Em crianças e adolescentes o IMC é comparado com outros da mesma idade e sexo. O escore-z diz quantos
                    desvios-padrão o valor está da mediana da referência da OMS: 0 é a mediana; entre −2 e +1 é a faixa
                    considerada adequada.
                  </Info>
                }
                valor={
                  <span>
                    {fmt(imc.valor)} kg/m²
                    {imc.z != null && (
                      <span className="block text-xs font-normal text-suave">
                        z = {fmt(imc.z, 2)} · {imc.classificacao}
                      </span>
                    )}
                  </span>
                }
              />
            )}
            {crescimento && (
              <Linha
                rotulo="Velocidade de crescimento"
                valor={
                  <span>
                    {fmt(crescimento.cmAno)} cm/ano
                    {!crescimento.confiavel && (
                      <span className="block text-xs font-normal text-alerta">intervalo curto: valor pouco confiável</span>
                    )}
                  </span>
                }
              />
            )}
          </dl>
        </Cartao>

        <Cartao>
          <h2 className="mb-2 text-lg font-semibold">
            Maturação
            <Info titulo="Maturity offset e PHV" fonte={`${FONTE_MIRWALD_2002} | ${FONTE_MOORE_2015}`}>
              O PHV é o momento de crescimento mais rápido na adolescência (o &quot;estirão&quot;). O maturity offset
              estima quantos anos faltam (valor negativo) ou se passaram (positivo) desde o PHV, a partir de idade e
              medidas. É uma estimativa com erro de cerca de ±1 ano.
            </Info>
          </h2>
          {maturacao ? (
            <dl>
              <Linha
                rotulo="Fase"
                valor={<Selo tom={maturacao.fase === "circa_phv" ? "alerta" : "info"}>{ROTULO_FASE[maturacao.fase]}</Selo>}
              />
              <Linha
                rotulo={`Anos até/desde o PHV (${NOME_EQUACAO[maturacao.equacao]})`}
                valor={`${maturacao.offset > 0 ? "+" : ""}${fmt(maturacao.offset, 2)}`}
              />
              {!simples &&
                (Object.keys(maturacao.offsets) as (keyof typeof maturacao.offsets)[])
                  .filter((e) => e !== maturacao.equacao)
                  .map((e) => (
                    <Linha
                      key={e}
                      rotulo={`${NOME_EQUACAO[e]} (comparação)`}
                      valor={<span className="font-normal text-suave">{`${maturacao.offsets[e] > 0 ? "+" : ""}${fmt(maturacao.offsets[e], 2)}`}</span>}
                    />
                  ))}
              <Linha rotulo="Idade estimada do PHV" valor={`${fmt(maturacao.aphv)} anos`} />
              <Linha
                rotulo="Idade biológica"
                info={
                  <Info titulo="Idade biológica" fonte={parametros.aphvCitacao ?? undefined}>
                    Idade &quot;do corpo&quot;: maturity offset somado à idade média do PHV da população de referência.
                    Um aluno com idade biológica menor que a cronológica está amadurecendo mais tarde e não deve ser
                    rotulado como fraco por isso.
                  </Info>
                }
                valor={
                  maturacao.idadeBiologica != null ? (
                    `${fmt(maturacao.idadeBiologica)} anos`
                  ) : (
                    <span className="text-sm font-normal text-suave">sem referência de PHV cadastrada</span>
                  )
                }
              />
              {estaturaAdulta && (
                <Linha
                  rotulo="Estatura adulta predita (Khamis-Roche)"
                  valor={
                    "erro" in estaturaAdulta ? (
                      <span className="text-sm font-normal text-suave">{estaturaAdulta.erro}</span>
                    ) : (
                      <span>
                        {fmt(estaturaAdulta.estaturaAdultaCm)} cm
                        <span className="block text-xs font-normal text-suave">
                          {fmt(estaturaAdulta.percentualAtingido)}% já atingido
                        </span>
                      </span>
                    )
                  }
                />
              )}
            </dl>
          ) : (
            <p className="text-sm text-suave">Informe massa, estatura e altura sentado para estimar a maturação.</p>
          )}
        </Cartao>
      </div>

      {radar.length >= 3 && (
        <Cartao>
          <h2 className="text-lg font-semibold">Perfil físico (percentis)</h2>
          <p className="text-sm text-suave">
            50 = metade dos jovens da referência teve resultado melhor e metade, pior.
            {temBiologica && " A linha tracejada compara com jovens da mesma idade biológica."}
          </p>
          <RadarPerfil dados={radar} />
        </Cartao>
      )}

      <Cartao>
        <h2 className="mb-3 text-lg font-semibold">Testes</h2>
        {!resultados.length && <p className="text-sm text-suave">Nenhum teste registrado.</p>}
        <ul className="space-y-4">
          {resultados.map((r) => {
            const chave = `${r.teste.id}|${r.lado}`;
            const pontos = historico?.get(chave) ?? [];
            return (
              <li key={chave} className="border-t border-borda pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{nomeResultado(r)}</p>
                  <p className="text-xl font-bold">
                    {r.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                    <span className="text-sm font-normal text-suave">{r.teste.unidade}</span>
                  </p>
                </div>
                {!simples && r.tentativas.length > 1 && (
                  <p className="text-xs text-suave">
                    Tentativas: {r.tentativas.map((t) => fmt(t, 2)).join(" · ")} ({r.teste.criterio === "melhor" ? "conta a melhor" : "conta a média"})
                  </p>
                )}
                {r.criterios && (
                  <p className="text-xs text-suave">
                    {Object.entries(r.criterios).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </p>
                )}
                {r.vo2max != null && (
                  <p className="text-sm">
                    VO2máx estimado: <strong>{fmt(r.vo2max)} mL·kg⁻¹·min⁻¹</strong>{" "}
                    <Info titulo="VO2máx estimado" fonte={FONTE_LEGER_1988}>
                      Estimativa da capacidade aeróbia a partir do último estágio e da idade. Não substitui teste de laboratório.
                    </Info>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <Selo tom={r.cronologica.tipo === "sem_referencia" ? "neutro" : "info"}>
                    Pela idade: {textoComparacao(r.cronologica, simples)}
                  </Selo>
                  {r.biologica && r.tabela && (
                    <Selo tom={r.biologica.tipo === "sem_referencia" ? "neutro" : "info"}>
                      Pela idade biológica: {textoComparacao(r.biologica, simples)}
                    </Selo>
                  )}
                  {r.mediaTurma && (
                    <Selo>
                      Média da turma: {fmt(r.mediaTurma.media)} {r.teste.unidade} (n={r.mediaTurma.n})
                    </Selo>
                  )}
                </div>
                {pontos.length >= 2 && (
                  <LinhaDoTempo
                    pontos={pontos}
                    unidade={r.teste.unidade}
                    mediaTurma={r.mediaTurma?.media}
                    maiorMelhor={r.teste.maior_melhor}
                  />
                )}
                {r.tabela && (
                  <p className="mt-1 text-[11px] leading-snug text-suave">
                    Referência: {r.tabela.nome} ({r.tabela.populacao}). {citacaoCurta(r.tabela)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {resultados.some((r) => !r.teste.maior_melhor) && (
          <p className="mt-3 text-xs text-suave">Em testes de tempo, menor é melhor; nos gráficos, o eixo é invertido para que &quot;subir&quot; seja melhorar.</p>
        )}
      </Cartao>

      {simples && (
        <Aviso titulo="O que esses números significam">
          Os testes mostram como seu filho está hoje em força, velocidade, salto, resistência e flexibilidade, comparado
          com jovens da mesma idade e sexo de estudos científicos. Percentil 50 é o meio: metade foi melhor, metade foi
          pior. Na adolescência, quem amadurece mais tarde costuma ter números menores por um tempo, e isso é normal;
          por isso também comparamos pela idade biológica. O mais importante é a evolução ao longo das avaliações.
        </Aviso>
      )}

      {resumo.fontes.length > 0 && (
        <footer className="text-[11px] leading-snug text-suave">
          <p className="font-semibold">Referências</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            {resumo.fontes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
          <p className="mt-2">Avaliação de {formatarData(av.data)}.</p>
        </footer>
      )}
    </div>
  );
}
