import { exigirPapel } from "@/lib/auth";
import { Casca } from "@/components/casca";

export default async function LayoutAluno({ children }: { children: React.ReactNode }) {
  const perfil = await exigirPapel("aluno");
  return <Casca nome={perfil.nome || perfil.email} menu={[]}>{children}</Casca>;
}
