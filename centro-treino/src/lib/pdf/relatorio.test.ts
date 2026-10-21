import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { RelatorioPdf } from "./relatorio";
import { resumoFicticio } from "@/test/fixture-avaliacao";

describe("relatório em PDF", () => {
  it("gera um PDF válido", async () => {
    const pdf = await renderToBuffer(RelatorioPdf({ r: resumoFicticio }));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
    // Para inspecionar: SALVAR_PDF=/caminho/arquivo.pdf npx vitest run src/lib/pdf
    if (process.env.SALVAR_PDF) writeFileSync(process.env.SALVAR_PDF, pdf);
  }, 20000);
});
