import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_NOME_CENTRO ?? "Centro de Treinamento",
  description: "Avaliação física, treino e acompanhamento de jovens atletas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0f14",
};

// Aplica o tema salvo antes da pintura, evitando "piscar" o tema errado
const scriptTema = `try{if(localStorage.getItem("tema")==="claro")document.documentElement.classList.add("claro")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
