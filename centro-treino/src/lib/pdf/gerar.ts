import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { RelatorioPdf } from "./relatorio";
import type { ResumoAvaliacao } from "../avaliacao";

export async function gerarRelatorioPdf(resumo: ResumoAvaliacao): Promise<Buffer> {
  return renderToBuffer(RelatorioPdf({ r: resumo }));
}
