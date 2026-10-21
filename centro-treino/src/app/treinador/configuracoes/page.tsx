import { clienteServidor } from "@/lib/supabase/servidor";
import { Cartao } from "@/components/ui/cartao";
import { FONTE_KHAMIS_ROCHE_1994 } from "@/lib/ciencia/maturacao";
import { FormKhamisRoche, FormMaturacao } from "./formularios";

export default async function Configuracoes() {
  const supabase = await clienteServidor();
  const [{ data: params }, { count: kr }] = await Promise.all([
    supabase.from("parametros").select("*"),
    supabase.from("khamis_roche_coeficientes").select("sexo", { count: "exact", head: true }),
  ]);
  const p = new Map((params ?? []).map((x) => [x.chave, x]));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Configurações científicas</h1>
      <Cartao className="space-y-3">
        <h2 className="text-lg font-semibold">Maturação</h2>
        <FormMaturacao
          equacao={p.get("equacao_maturacao")?.valor ?? "moore_2015"}
          limiares={p.get("limiares_fase")?.valor ?? { inicioCirca: -1, fimCirca: 1 }}
          limiaresCitacao={p.get("limiares_fase")?.citacao ?? null}
          aphv={p.get("aphv_referencia")?.valor ?? { M: null, F: null }}
          aphvCitacao={p.get("aphv_referencia")?.citacao ?? null}
        />
      </Cartao>
      <Cartao className="space-y-3">
        <h2 className="text-lg font-semibold">Khamis-Roche — estatura adulta predita</h2>
        <p className="text-sm text-suave">
          {kr ? `${kr} linhas de coeficientes cadastradas.` : "Nenhum coeficiente cadastrado: a predição fica desligada."}
        </p>
        <p className="text-xs text-suave">Artigo original: {FONTE_KHAMIS_ROCHE_1994}</p>
        <FormKhamisRoche citacao={p.get("khamis_roche")?.citacao ?? null} />
      </Cartao>
    </div>
  );
}
