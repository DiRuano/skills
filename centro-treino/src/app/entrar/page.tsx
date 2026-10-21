import { FormularioEntrar } from "./formulario";
import { RodapeLegal } from "@/components/rodape-legal";
import { AlternarTema } from "@/components/alternar-tema";
import { Logo } from "@/components/marca";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string; erro?: string }> }) {
  const { voltar = "/", erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-2 flex justify-end">
        <AlternarTema />
      </div>
      <div className="mb-8">
        <h1 className="sr-only">{process.env.NEXT_PUBLIC_NOME_CENTRO ?? "Movimento Aplicado"}</h1>
        <Logo className="h-16 sm:h-20" />
        <p className="mt-6 text-suave">Entre para ver treinos, avaliações e pagamentos.</p>
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
