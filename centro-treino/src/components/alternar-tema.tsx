"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Alterna entre tema escuro (padrão) e claro; lembra a escolha no aparelho. */
export function AlternarTema() {
  const [claro, setClaro] = useState(false);
  useEffect(() => setClaro(document.documentElement.classList.contains("claro")), []);

  function alternar() {
    const novo = !claro;
    document.documentElement.classList.toggle("claro", novo);
    try {
      localStorage.setItem("tema", novo ? "claro" : "escuro");
    } catch {
      /* armazenamento indisponível: vale só para esta visita */
    }
    setClaro(novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={claro ? "Usar tema escuro" : "Usar tema claro"}
      className="inline-flex size-11 items-center justify-center rounded-xl text-suave hover:bg-superficie-2 hover:text-texto"
    >
      {claro ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </button>
  );
}
