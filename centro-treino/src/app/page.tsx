import { redirect } from "next/navigation";
import { perfilAtual } from "@/lib/auth";
import { ROTA_INICIAL } from "@/lib/tipos";

// Página inicial: manda cada perfil para a sua área
export default async function Inicio() {
  const perfil = await perfilAtual();
  redirect(perfil ? ROTA_INICIAL[perfil.papel] : "/entrar");
}
