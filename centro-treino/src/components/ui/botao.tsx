import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";

const estilos: Record<Variante, string> = {
  primario: "bg-primaria text-destaque-texto hover:brightness-110",
  secundario: "bg-superficie-2 text-texto border border-borda hover:brightness-110",
  fantasma: "text-texto hover:bg-superficie-2",
  perigo: "bg-perigo text-white hover:brightness-110",
};

/** Botão grande (mín. 48px de altura) — pensado para toque no celular. */
export const Botao = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }
>(({ className, variante = "primario", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque disabled:opacity-50",
      estilos[variante],
      className,
    )}
    {...props}
  />
));
Botao.displayName = "Botao";

export function classeBotao(variante: Variante = "primario", extra?: string) {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition",
    estilos[variante],
    extra,
  );
}
