import { FormularioEntrar } from "./formulario";
import { RodapeLegal } from "@/components/rodape-legal";
import { AlternarTema } from "@/components/alternar-tema";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string; erro?: string }> }) {
  const { voltar = "/", erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{process.env.NEXT_PUBLIC_NOME_CENTRO ?? "Centro de Treinamento"}</h1>
          <p className="mt-1 text-suave">Entre para ver treinos, avaliações e pagamentos.</p>
        </div>
        <AlternarTema />
      </div>
      {erro && <p className="mb-4 text-sm text-perigo">O link expirou ou é inválido. Peça um novo abaixo.</p>}
      <FormularioEntrar voltar={voltar} />
      <p className="mt-6 text-center text-sm text-suave">
        Ainda não tem acesso? O cadastro é feito pelo treinador, que envia um convite por e-mail.
      </p>
      <RodapeLegal />
    </main>
  );
}
