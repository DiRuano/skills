import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Cartao({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-borda bg-superficie p-4 sm:p-5", className)} {...props} />;
}

export function Selo({
  tom = "neutro",
  children,
}: {
  tom?: "neutro" | "sucesso" | "alerta" | "perigo" | "info";
  children: ReactNode;
}) {
  const tons = {
    neutro: "bg-superficie-2 text-suave",
    sucesso: "bg-primaria/15 text-primaria",
    alerta: "bg-alerta/15 text-alerta",
    perigo: "bg-perigo/15 text-perigo",
    info: "bg-info/15 text-info",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tons[tom])}>
      {children}
    </span>
  );
}

export function Aviso({
  tom = "info",
  titulo,
  children,
}: {
  tom?: "info" | "alerta" | "perigo" | "sucesso";
  titulo?: ReactNode;
  children?: ReactNode;
}) {
  const tons = {
    info: "border-info/40 bg-info/10",
    alerta: "border-alerta/40 bg-alerta/10",
    perigo: "border-perigo/40 bg-perigo/10",
    sucesso: "border-primaria/40 bg-primaria/10",
  };
  return (
    <div className={cn("rounded-xl border p-4 text-sm", tons[tom])} role={tom === "perigo" ? "alert" : "status"}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className={cn(titulo && "mt-1", "text-suave")}>{children}</div>}
    </div>
  );
}
