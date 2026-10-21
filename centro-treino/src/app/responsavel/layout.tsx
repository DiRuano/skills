import { exigirPapel } from "@/lib/auth";
import { Casca } from "@/components/casca";

export default async function LayoutResponsavel({ children }: { children: React.ReactNode }) {
  const perfil = await exigirPapel("responsavel");
  return (
    <Casca
      nome={perfil.nome || perfil.email}
      menu={[
        { href: "/responsavel", rotulo: "Meus filhos" },
        { href: "/responsavel/privacidade", rotulo: "Consentimentos e privacidade" },
      ]}
    >
      {children}
    </Casca>
  );
}
