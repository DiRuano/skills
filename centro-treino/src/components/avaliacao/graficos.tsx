"use client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarData } from "@/lib/idade";

const eixo = { fill: "var(--texto-suave)", fontSize: 12 };
const estiloTooltip = {
  contentStyle: {
    background: "var(--superficie-2)",
    border: "1px solid var(--borda)",
    borderRadius: 12,
    color: "var(--texto)",
    fontSize: 13,
  },
  labelStyle: { color: "var(--texto)", fontWeight: 600 },
  itemStyle: { color: "var(--texto)" },
};

const numeroBr = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Nome curto para o eixo do radar no celular; o nome completo fica no tooltip e na tabela. */
function abreviar(nome: string, max = 13) {
  return nome.length <= max ? nome : `${nome.slice(0, max - 1).trimEnd()}…`;
}

export type PontoRadar = { teste: string; cronologica: number | null; biologica: number | null };

/** Perfil físico em percentis (0–100). Biológica aparece só se houver dados. */
export function RadarPerfil({ dados }: { dados: PontoRadar[] }) {
  const temBiologica = dados.some((d) => d.biologica != null);
  return (
    <figure>
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <RadarChart data={dados} outerRadius="60%" margin={{ top: 8, right: 36, bottom: 8, left: 36 }}>
            <PolarGrid stroke="var(--grade)" />
            <PolarAngleAxis dataKey="teste" tick={{ ...eixo, fontSize: 11 }} tickFormatter={(v: string) => abreviar(v, 11)} />
            {/* Escala 0–100 fixa; sem rótulos no eixo para não poluir (valores no tooltip e na tabela) */}
            <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
            <Radar
              name="Idade cronológica"
              dataKey="cronologica"
              stroke="var(--serie-1)"
              fill="var(--serie-1)"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--serie-1)", stroke: "var(--superficie)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {temBiologica && (
              <Radar
                name="Idade biológica"
                dataKey="biologica"
                stroke="var(--serie-2)"
                fill="var(--serie-2)"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 4, fill: "var(--serie-2)", stroke: "var(--superficie)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}
            <Tooltip {...estiloTooltip} formatter={(v: number) => (v == null ? "—" : `P${v}`)} />
            {temBiologica && (
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                // O texto usa a cor de texto; a cor da série fica só no ícone
                formatter={(v: string) => <span style={{ color: "var(--texto-suave)" }}>{v}</span>}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-suave">Ver em tabela</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-suave">
            <tr>
              <th className="py-1 font-medium">Teste</th>
              <th className="py-1 font-medium">Cronológica</th>
              {temBiologica && <th className="py-1 font-medium">Biológica</th>}
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.teste} className="border-t border-borda">
                <td className="py-1">{d.teste}</td>
                <td className="py-1">{d.cronologica == null ? "—" : `P${d.cronologica}`}</td>
                {temBiologica && <td className="py-1">{d.biologica == null ? "—" : `P${d.biologica}`}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Linha do tempo de um teste, com a média da turma como referência opcional. */
export function LinhaDoTempo({
  pontos,
  unidade,
  mediaTurma,
  maiorMelhor,
}: {
  pontos: { data: string; valor: number }[];
  unidade: string;
  mediaTurma?: number | null;
  maiorMelhor: boolean;
}) {
  const dados = pontos.map((p) => ({ ...p, rotulo: formatarData(p.data) }));
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={{ stroke: "var(--grade)" }} />
          <YAxis
            tick={eixo}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={numeroBr}
            reversed={!maiorMelhor}
            width={48}
          />
          <Tooltip {...estiloTooltip} formatter={(v: number) => [`${numeroBr(v)} ${unidade}`, "Resultado"]} />
          {mediaTurma != null && (
            <ReferenceLine
              y={mediaTurma}
              stroke="var(--texto-suave)"
              strokeDasharray="4 4"
              label={{ value: "média da turma", fill: "var(--texto-suave)", fontSize: 11, position: "insideTopLeft" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="valor"
            stroke="var(--serie-1)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--serie-1)", stroke: "var(--superficie)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
