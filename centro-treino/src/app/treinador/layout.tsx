import { exigirPapel } from "@/lib/auth";
import { Casca } from "@/components/casca";

export default async function LayoutTreinador({ children }: { children: React.ReactNode }) {
  const perfil = await exigirPapel("admin");
  return (
    <Casca
      nome={perfil.nome || perfil.email}
      menu={[
        { href: "/treinador", rotulo: "Painel" },
        { href: "/treinador/alunos", rotulo: "Alunos" },
        { href: "/treinador/solicitacoes", rotulo: "Solicitações LGPD" },
      ]}
    >
      {children}
    </Casca>
  );
}
