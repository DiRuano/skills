import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { idadeAnos } from "@/lib/idade";
import type { Aluno } from "@/lib/tipos";
import { Aviso } from "@/components/ui/cartao";
import { classeBotao } from "@/components/ui/botao";
import { MinhaEvolucao } from "./evolucao";

export default async function AreaAluno() {
  const supabase = await clienteServidor();
  const { data: aluno } = await supabase.from("alunos").select("*").maybeSingle<Aluno>();
  if (!aluno) return <Aviso titulo="Seu cadastro ainda não está pronto">Fale com o seu treinador.</Aviso>;

  const { data: ok } = await supabase.rpc("tem_consentimento", { p_aluno_id: aluno.id, p_tipo: "dados_menor" });
  const primeiroNome = aluno.nome.split(" ")[0];

  if (!ok) {
    const adulto = idadeAnos(aluno.data_nascimento) >= 18;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Oi, {primeiroNome}!</h1>
        {adulto ? (
          <>
            <p className="text-suave">Antes de começar, precisamos da sua autorização para usar seus dados.</p>
            <Link href={`/consentimento/${aluno.id}`} className={classeBotao("primario", "w-full")}>Ler e autorizar</Link>
          </>
        ) : (
          <Aviso titulo="Quase lá!">Seu responsável precisa liberar seu acesso no app dele.</Aviso>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Oi, {primeiroNome}! 👋</h1>
      <Aviso titulo="Seus treinos vão aparecer aqui">
        Em breve você vai ver o treino do dia e os vídeos dos exercícios.
      </Aviso>
      <h2 className="pt-2 text-lg font-semibold">Minha evolução</h2>
      <MinhaEvolucao alunoId={aluno.id} />
    </div>
  );
}
