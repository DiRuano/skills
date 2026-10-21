/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Logo do Movimento Aplicado, com a versão certa para cada tema. */
export function Logo({ className, so = "completa" }: { className?: string; so?: "completa" | "icone" }) {
  const base = so === "icone" ? "/marca/icone" : "/marca/logo";
  return (
    <span className={cn("inline-block", className)}>
      <img src={`${base}-escuro.png`} alt="Movimento Aplicado" className="logo-escuro h-full w-auto" />
      <img src={`${base}.png`} alt="Movimento Aplicado" className="logo-claro h-full w-auto" />
    </span>
  );
}
