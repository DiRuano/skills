import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResumoAvaliacao } from "../avaliacao";
import { formatarData } from "../idade";
import { ROTULO_FASE } from "../ciencia/maturacao";
import { descreverPercentil, type Comparacao } from "../ciencia/referencia";

/**
 * Relatório de avaliação para os pais: linguagem simples, poucas siglas,
 * fonte de cada comparação e referências no rodapé.
 */

const COR = process.env.CENTRO_COR || "#059669";
const NOME = process.env.NEXT_PUBLIC_NOME_CENTRO || "Centro de Treinamento";
const LOGO = process.env.CENTRO_LOGO_URL || null;

const s = StyleSheet.create({
  pagina: { padding: 36, paddingBottom: 64, fontSize: 10, fontFamily: "Helvetica", color: "#1f2933" },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `2pt solid ${COR}`, paddingBottom: 8, marginBottom: 14 },
  centro: { fontSize: 14, fontFamily: "Helvetica-Bold", color: COR },
  titulo: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sub: { color: "#52606d", marginBottom: 12 },
  secao: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, color: COR },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "0.5pt solid #e4e7eb" },
  suave: { color: "#52606d" },
  caixa: { backgroundColor: "#f5f7fa", borderRadius: 4, padding: 10, marginTop: 6 },
  alerta: { backgroundColor: "#fff7e6", border: "1pt solid #f0b429", borderRadius: 4, padding: 10, marginTop: 8 },
  teste: { paddingVertical: 6, borderBottom: "0.5pt solid #e4e7eb" },
  barraFundo: { height: 6, backgroundColor: "#e4e7eb", borderRadius: 3, marginTop: 4, position: "relative" },
  fonte: { fontSize: 7, color: "#7b8794", marginTop: 2 },
  rodape: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: "#7b8794" },
});

const fmt = (n: number, c = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: c, minimumFractionDigits: c });
// Resultado de teste: até 2 casas, sem zeros à direita (3,62 s · 31,5 cm · 6 estágios)
const fmtValor = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function textoComp(c: Comparacao | null) {
  if (!c || c.tipo === "sem_referencia") return "sem referência cadastrada";
  if (c.tipo === "zona") return c.zona;
  return `percentil ${fmt(c.percentil, 0)} (${descreverPercentil(c.percentil)})`;
}

function Barra({ p }: { p: number }) {
  return (
    <View style={s.barraFundo}>
      <View style={{ width: `${Math.max(2, Math.min(100, p))}%`, height: 6, backgroundColor: COR, borderRadius: 3 }} />
      {/* Marca do percentil 50 */}
      <View style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 10, backgroundColor: "#52606d" }} />
    </View>
  );
}

export function RelatorioPdf({ r }: { r: ResumoAvaliacao }) {
  const { aluno, avaliacao: av, maturacao, imc } = r;
  return (
    <Document title={`Avaliação — ${aluno.nome}`} author={NOME} language="pt-BR">
      <Page size="A4" style={s.pagina}>
        <View style={s.topo} fixed>
          <Text style={s.centro}>{NOME}</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {LOGO && <Image src={LOGO} style={{ height: 28 }} />}
        </View>

        <Text style={s.titulo}>Relatório de avaliação física</Text>
        <Text style={s.sub}>
          {aluno.nome} · {fmt(r.idade)} anos · avaliação de {formatarData(av.data)}
        </Text>

        <View style={s.caixa}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>O que esses números significam</Text>
          <Text>
            Os testes mostram como seu filho está hoje em força, velocidade, salto, resistência e flexibilidade, comparado com
            jovens da mesma idade e sexo de estudos científicos. Percentil 50 é o meio: metade foi melhor e metade foi pior. Na
            adolescência, quem amadurece mais tarde costuma ter números menores por um tempo, e isso é normal. Por isso também
            comparamos pela idade biológica. O mais importante é a evolução de uma avaliação para a outra.
          </Text>
        </View>

        {maturacao?.fase === "circa_phv" && (
          <View style={s.alerta}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Fase de estirão</Text>
            <Text>
              O corpo está crescendo rápido. É comum perder um pouco de coordenação por um tempo, e ossos e tendões ficam mais
              sensíveis. Nesta fase o treino prioriza técnica e controla saltos e impactos.
            </Text>
          </View>
        )}

        <Text style={s.secao}>Medidas e crescimento</Text>
        {av.massa_kg != null && (
          <View style={s.linha}><Text>Massa</Text><Text>{fmt(Number(av.massa_kg))} kg</Text></View>
        )}
        {av.estatura_cm != null && (
          <View style={s.linha}><Text>Estatura</Text><Text>{fmt(Number(av.estatura_cm))} cm</Text></View>
        )}
        {imc && (
          <View style={s.linha}>
            <Text>IMC para a idade</Text>
            <Text>{fmt(imc.valor)} kg/m²{imc.classificacao ? ` — ${imc.classificacao}` : ""}</Text>
          </View>
        )}
        {r.crescimento?.confiavel && (
          <View style={s.linha}><Text>Velocidade de crescimento</Text><Text>{fmt(r.crescimento.cmAno)} cm/ano</Text></View>
        )}
        {maturacao && (
          <>
            <View style={s.linha}><Text>Fase de maturação</Text><Text>{ROTULO_FASE[maturacao.fase]}</Text></View>
            <View style={s.linha}>
              <Text>Tempo até / desde o estirão (estimativa)</Text>
              <Text>{maturacao.offset > 0 ? "+" : ""}{fmt(maturacao.offset)} ano(s)</Text>
            </View>
            {maturacao.idadeBiologica != null && (
              <View style={s.linha}><Text>Idade biológica estimada</Text><Text>{fmt(maturacao.idadeBiologica)} anos</Text></View>
            )}
          </>
        )}
        {r.estaturaAdulta && !("erro" in r.estaturaAdulta) && (
          <View style={s.linha}>
            <Text>Estatura adulta prevista</Text>
            <Text>{fmt(r.estaturaAdulta.estaturaAdultaCm)} cm ({fmt(r.estaturaAdulta.percentualAtingido)}% já atingido)</Text>
          </View>
        )}

        <Text style={s.secao}>Testes físicos</Text>
        <Text style={[s.suave, { fontSize: 8, marginBottom: 4 }]}>
          A barra mostra o percentil pela idade; o traço vertical marca o meio (percentil 50).
        </Text>
        {r.resultados.map((x) => (
          <View key={`${x.teste.id}${x.lado}`} style={s.teste} wrap={false}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {x.teste.nome}{x.lado === "D" ? " (direita)" : x.lado === "E" ? " (esquerda)" : ""}
              </Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {fmtValor(x.valor)} {x.teste.unidade}
              </Text>
            </View>
            <Text style={s.suave}>Pela idade: {textoComp(x.cronologica)}</Text>
            {x.biologica && x.tabela && <Text style={s.suave}>Pela idade biológica: {textoComp(x.biologica)}</Text>}
            {x.vo2max != null && <Text style={s.suave}>Capacidade aeróbia estimada (VO2máx): {fmt(x.vo2max)} mL/kg/min</Text>}
            {x.cronologica.tipo === "percentil" && <Barra p={x.cronologica.percentil} />}
            {x.tabela && (
              <Text style={s.fonte}>
                Fonte: {x.tabela.nome} ({x.tabela.populacao}). {x.tabela.citacao}
              </Text>
            )}
          </View>
        ))}
        {!r.resultados.length && <Text style={s.suave}>Nenhum teste nesta avaliação.</Text>}

        {r.fontes.length > 0 && (
          <View style={{ marginTop: 16 }} wrap={false}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Referências</Text>
            {r.fontes.map((f, i) => (
              <Text key={f} style={{ fontSize: 7, color: "#52606d", marginBottom: 2 }}>{i + 1}. {f}</Text>
            ))}
          </View>
        )}

        <Text
          style={s.rodape}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${NOME} · Documento confidencial com dados de saúde de menor (LGPD). Estimativas não substituem avaliação médica. Página ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
