import Link from "next/link";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { AlternarTema } from "./alternar-tema";
import { sair } from "@/app/entrar/acoes";

export type ItemMenu = { href: string; rotulo: string };

/** Estrutura comum das áreas logadas: topo, menu e conteúdo. */
export function Casca({ nome, menu, children }: { nome: string; menu: ItemMenu[]; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between gap-2 py-4">
        <Link href="/" className="truncate font-bold">
          {process.env.NEXT_PUBLIC_NOME_CENTRO ?? "Centro de Treinamento"}
        </Link>
        <div className="flex items-center gap-1">
          <span className="hidden text-sm text-suave sm:inline">{nome}</span>
          <AlternarTema />
          <form action={sair}>
            <button
              type="submit"
              aria-label="Sair"
              className="inline-flex size-11 items-center justify-center rounded-xl text-suave hover:bg-superficie-2 hover:text-texto"
            >
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </header>
      {menu.length > 1 && (
        <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Menu principal">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="shrink-0 rounded-full border border-borda bg-superficie px-4 py-2 text-sm font-medium hover:bg-superficie-2"
            >
              {m.rotulo}
            </Link>
          ))}
        </nav>
      )}
      <main>{children}</main>
    </div>
  );
}
