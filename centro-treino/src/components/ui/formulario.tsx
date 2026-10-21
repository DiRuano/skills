import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-borda bg-superficie-2 px-4 text-base text-texto placeholder:text-suave " +
  "focus:outline-2 focus:outline-destaque aria-[invalid=true]:border-perigo";

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, "min-h-12", className)} {...props} />,
);
Entrada.displayName = "Entrada";

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, "min-h-24 py-3", className)} {...props} />,
);
AreaTexto.displayName = "AreaTexto";

export const Selecao = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(base, "min-h-12", className)} {...props} />,
);
Selecao.displayName = "Selecao";

/** Campo com rótulo, dica e mensagem de erro. */
export function Campo({
  rotulo,
  nome,
  erro,
  dica,
  children,
}: {
  rotulo: ReactNode;
  nome: string;
  erro?: string;
  dica?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={nome} className="block text-sm font-medium">
        {rotulo}
      </label>
      {children}
      {dica && !erro && <p className="text-xs text-suave">{dica}</p>}
      {erro && (
        <p id={`${nome}-erro`} className="text-sm text-perigo" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
