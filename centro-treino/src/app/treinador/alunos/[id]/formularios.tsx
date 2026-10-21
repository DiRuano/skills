"use client";
import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Aviso } from "@/components/ui/cartao";
import { AreaTexto, Campo, Entrada, Selecao } from "@/components/ui/formulario";
import type { Aluno } from "@/lib/tipos";
import { convidarAluno, editarAluno, enviarFoto, salvarSaude, type Estado } from "./acoes";

function Retorno({ estado }: { estado: Estado }) {
  if (estado.erro) return <Aviso tom="perigo" titulo={estado.erro} />;
  if (estado.ok) return <Aviso tom="sucesso" titulo={estado.ok} />;
  return null;
}

export function FormSaude({ alunoId, lesoes, observacoes }: { alunoId: string; lesoes: string; observacoes: string }) {
  const [estado, acao, enviando] = useActionState(salvarSaude.bind(null, alunoId), {});
  return (
    <form action={acao} className="space-y-3">
      <Campo rotulo="Histórico de lesões" nome="historico_lesoes">
        <AreaTexto id="historico_lesoes" name="historico_lesoes" defaultValue={lesoes} />
      </Campo>
      <Campo rotulo="Observações" nome="observacoes">
        <AreaTexto id="observacoes" name="observacoes" defaultValue={observacoes} />
      </Campo>
      <Retorno estado={estado} />
      <Botao type="submit" variante="secundario" disabled={enviando}>Salvar saúde</Botao>
    </form>
  );
}

export function FormEdicao({ aluno }: { aluno: Aluno }) {
  const [estado, acao, enviando] = useActionState(editarAluno.bind(null, aluno.id), {});
  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-2">
      <Campo rotulo="Nome" nome="nome">
        <Entrada id="nome" name="nome" defaultValue={aluno.nome} required />
      </Campo>
      <Campo rotulo="Sexo biológico" nome="sexo_biologico">
        <Selecao id="sexo_biologico" name="sexo_biologico" defaultValue={aluno.sexo_biologico}>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </Selecao>
      </Campo>
      <Campo rotulo="Modalidade" nome="modalidade">
        <Entrada id="modalidade" name="modalidade" defaultValue={aluno.modalidade ?? ""} />
      </Campo>
      <Campo rotulo="Lado dominante" nome="lado_dominante">
        <Selecao id="lado_dominante" name="lado_dominante" defaultValue={aluno.lado_dominante ?? ""}>
          <option value="">Não informado</option>
          <option value="direito">Direito</option>
          <option value="esquerdo">Esquerdo</option>
          <option value="ambidestro">Ambidestro</option>
        </Selecao>
      </Campo>
      <Campo rotulo="Situação" nome="status">
        <Selecao id="status" name="status" defaultValue={aluno.status}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="aguardando_consentimento">Aguardando consentimento</option>
        </Selecao>
      </Campo>
      <div className="sm:col-span-2 space-y-3">
        <Retorno estado={estado} />
        <Botao type="submit" variante="secundario" disabled={enviando}>Salvar dados</Botao>
      </div>
    </form>
  );
}

export function FormConviteAluno({ alunoId }: { alunoId: string }) {
  const [estado, acao, enviando] = useActionState(convidarAluno.bind(null, alunoId), {});
  return (
    <form action={acao} className="space-y-3">
      <Campo rotulo="E-mail do aluno" nome="email_aluno" dica="O aluno recebe um convite para criar a senha.">
        <Entrada id="email_aluno" name="email" type="email" inputMode="email" required />
      </Campo>
      <Retorno estado={estado} />
      <Botao type="submit" variante="secundario" disabled={enviando}>Criar acesso do aluno</Botao>
    </form>
  );
}

export function FormFoto({ alunoId }: { alunoId: string }) {
  const [estado, acao, enviando] = useActionState(enviarFoto.bind(null, alunoId), {});
  return (
    <form action={acao} className="space-y-3">
      <Entrada name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="py-2.5" aria-label="Foto" />
      <Retorno estado={estado} />
      <Botao type="submit" variante="secundario" disabled={enviando}>Enviar foto</Botao>
    </form>
  );
}
