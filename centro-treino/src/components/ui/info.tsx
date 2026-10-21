"use client";
import { useId, useState, type ReactNode } from "react";
import { Info as IconeInfo } from "lucide-react";

/**
 * Ícone "i" que abre a explicação de uma métrica e a sua fonte.
 * Toda métrica científica do app deve usar este componente.
 */
export function Info({ titulo, children, fonte }: { titulo: string; children: ReactNode; fonte?: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={`O que é: ${titulo}`}
        onClick={() => setAberto((a) => !a)}
        className="inline-flex size-7 items-center justify-center rounded-full text-suave hover:text-texto"
      >
        <IconeInfo className="size-4" />
      </button>
      {aberto && (
        <span
          id={id}
          role="dialog"
          className="absolute left-1/2 z-20 mt-1 block w-72 max-w-[85vw] -translate-x-1/2 rounded-xl border border-borda bg-superficie-2 p-3 text-left text-sm shadow-xl"
        >
          <span className="block font-semibold">{titulo}</span>
          <span className="mt-1 block text-suave">{children}</span>
          {fonte && <span className="mt-2 block text-xs text-suave">Fonte: {fonte}</span>}
        </span>
      )}
    </span>
  );
}
