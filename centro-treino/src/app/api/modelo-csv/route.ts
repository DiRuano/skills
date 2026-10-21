import { NextResponse, type NextRequest } from "next/server";
import { MODELO_PERCENTIL, MODELO_ZONA } from "@/lib/ciencia/importacao";

const MODELO_KR =
  "sexo,idade,intercepto,coef_estatura,coef_massa,coef_estatura_pais\n" +
  "M,4,,,,\nM,4.5,,,,\nF,4,,,,\n";

/** Modelos de CSV para importação (vazios: os valores vêm dos artigos). */
export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo");
  const conteudo = tipo === "zona" ? MODELO_ZONA : tipo === "khamis_roche" ? MODELO_KR : MODELO_PERCENTIL;
  return new NextResponse("﻿" + conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="modelo-${tipo ?? "percentil"}.csv"`,
    },
  });
}
