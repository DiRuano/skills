"use client";
import { useActionState, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Aviso, Cartao } from "@/components/ui/cartao";
import { AreaTexto, Campo, Entrada, Selecao } from "@/components/ui/formulario";
import { ehMenor } from "@/lib/idade";
import { criarAluno, type EstadoNovoAluno } from "./acoes";

export function FormularioNovoAluno() {
  const [estado, acao, enviando] = useActionState<EstadoNovoAluno, FormData>(criarAluno, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  const [nascimento, setNascimento] = useState(v.data_nascimento ?? "");
  const menor = nascimento ? ehMenor(nascimento) : true;

  const props = (nome: string) => ({
    id: nome,
    name: nome,
    defaultValue: v[nome],
    "aria-invalid": Boolean(e[nome]),
    "aria-describedby": e[nome] ? `${nome}-erro` : undefined,
  });

  return (
    <form action={acao} className="space-y-6">
      <Cartao className="space-y-4">
        <h2 className="text-lg font-semibold">Aluno</h2>
        <Campo rotulo="Nome completo" nome="nome" erro={e.nome}>
          <Entrada {...props("nome")} autoComplete="off" required />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Data de nascimento" nome="data_nascimento" erro={e.data_nascimento}>
            <Entrada {...props("data_nascimento")} type="date" required onChange={(ev) => setNascimento(ev.target.value)} />
          </Campo>
          <Campo
            rotulo="Sexo biológico"
            nome="sexo_biologico"
            erro={e.sexo_biologico}
            dica="Necessário para usar as tabelas de referência e equações de maturação, que são separadas por sexo."
          >
            <Selecao {...props("sexo_biologico")} required>
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Modalidade / esporte" nome="modalidade" erro={e.modalidade}>
            <Entrada {...props("modalidade")} placeholder="Ex.: futebol, natação" />
          </Campo>
          <Campo rotulo="Lado dominante" nome="lado_dominante" erro={e.lado_dominante}>
            <Selecao {...props("lado_dominante")}>
              <option value="">Não informado</option>
              <option value="direito">Direito</option>
              <option value="esquerdo">Esquerdo</option>
              <option value="ambidestro">Ambidestro</option>
            </Selecao>
          </Campo>
        </div>
      </Cartao>

      <Cartao className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Saúde</h2>
          <p className="text-sm text-suave">Dado sensível: guardado cifrado e visível só para a equipe técnica.</p>
        </div>
        <Campo rotulo="Histórico de lesões" nome="historico_lesoes" erro={e.historico_lesoes}>
          <AreaTexto {...props("historico_lesoes")} placeholder="Lesão, lado, quando, se ainda incomoda" />
        </Campo>
        <Campo rotulo="Observações" nome="observacoes" erro={e.observacoes}>
          <AreaTexto {...props("observacoes")} />
        </Campo>
      </Cartao>

      <Cartao className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Responsável {menor ? "(obrigatório)" : "(opcional)"}</h2>
          <p className="text-sm text-suave">
            O responsável recebe um convite por e-mail e precisa dar o consentimento (LGPD, art. 14) antes de
            qualquer avaliação ou treino. Se o e-mail já tiver conta, o aluno é vinculado a ela.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome do responsável" nome="responsavel_nome" erro={e.responsavel_nome}>
            <Entrada {...props("responsavel_nome")} required={menor} />
          </Campo>
          <Campo rotulo="Parentesco" nome="responsavel_parentesco">
            <Entrada {...props("responsavel_parentesco")} placeholder="Mãe, pai, tutor..." />
          </Campo>
        </div>
        <Campo rotulo="E-mail do responsável" nome="responsavel_email" erro={e.responsavel_email}>
          <Entrada {...props("responsavel_email")} type="email" inputMode="email" required={menor} />
        </Campo>
      </Cartao>

      {!menor && (
        <Cartao className="space-y-4">
          <h2 className="text-lg font-semibold">Acesso do aluno</h2>
          <Campo
            rotulo="E-mail do aluno"
            nome="aluno_email"
            erro={e.aluno_email}
            dica="Aluno maior de idade recebe convite e dá o próprio consentimento."
          >
            <Entrada {...props("aluno_email")} type="email" inputMode="email" />
          </Campo>
        </Cartao>
      )}

      {e._form && <Aviso tom="perigo" titulo={e._form} />}
      <Botao type="submit" className="w-full sm:w-auto" disabled={enviando}>
        {enviando ? "Salvando..." : "Cadastrar e enviar convite"}
      </Botao>
    </form>
  );
}
